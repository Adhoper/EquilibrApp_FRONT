import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';

import { AuthService } from '../../services/AuthService.service';
import { LoaderService } from '../../services/loader.service';
import { SwalService } from '../../services/swal.service';
import { ToastService } from '../../services/toast.service'; // (por si luego lo necesitas)
import { CuentaService } from '../../services/Cuenta.service';

type Cuenta = {
  idCuenta: number;
  idUsuario: number;
  nombreCuenta: string;
  estatus?: 'A' | 'I';
  // opcionales (por si tu API los trae; no se envían al guardar)
  colorHexadecimal?: string | null;
};

type Filtro = 'todas' | 'inactivas';

@Component({
  selector: 'app-cuentas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cuentas.html'
})
export class Cuentas implements OnInit {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private ctaSrv = inject(CuentaService);
  private loader = inject(LoaderService);
  private swal   = inject(SwalService);
  private toast  = inject(ToastService);

  user = this.auth.getUsuario();
  idUsuario = this.user?.idUsuario ?? 0;

  // state
  cuentas  = signal<Cuenta[]>([]);
  cargando = signal(false);

  // búsqueda / filtros
  buscarTxt  = signal('');
  filtro     = signal<Filtro>('todas');

  // form
  form = this.fb.group({
    idCuenta: this.fb.control<number | null>(null),
    nombreCuenta: this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    colorHexadecimal: this.fb.control<string>('#22C55E', { nonNullable: true })
  });
  get f() { return this.form.controls; }

  // que el título reaccione incluso al reset()
  private idCuentaSig = toSignal(
    this.f.idCuenta.valueChanges.pipe(startWith(this.f.idCuenta.value)),
    { initialValue: this.f.idCuenta.value }
  );
  editando = computed(() => this.idCuentaSig() != null);

  // listado filtrado (cliente)
  listaFiltrada = computed(() => {
    const q = this.buscarTxt().trim().toLowerCase();
    const showInactivas = this.filtro() === 'inactivas';
    let arr = this.cuentas();

    if (showInactivas) {
      arr = arr.filter(x => (x.estatus ?? 'A') === 'I');
    } else {
      // si tu API devuelve activas por defecto, genial; si no, esto asegura mostrar A
      arr = arr.filter(x => (x.estatus ?? 'A') === 'A');
    }

    if (q) arr = arr.filter(x => (x.nombreCuenta || '').toLowerCase().includes(q));

    return [...arr].sort((a, b) => a.nombreCuenta.localeCompare(b.nombreCuenta));
  });

  ngOnInit(): void {
    this.cargarLista();
  }

  // === DATA ===
  private asList(r: any): Cuenta[] {
    const raw = Array.isArray(r) ? r : (r?.dataList ?? r ?? []);
    // normalización defensiva
    return (raw || []).map((x: any) => ({
      idCuenta: x.idCuenta,
      idUsuario: x.idUsuario ?? this.idUsuario,
      nombreCuenta: x.nombreCuenta ?? x.cuenta ?? '',
      estatus: x.estatus ?? 'A',
      colorHexadecimal: x.colorHexadecimal ?? null
    })) as Cuenta[];
  }

  cargarLista() {
    this.cargando.set(true);
    this.loader.show();
    this.ctaSrv.Listar(this.idUsuario).pipe(
      finalize(() => { this.cargando.set(false); this.loader.hide(); })
    ).subscribe({
      next: (r: any) => this.cuentas.set(this.asList(r)),
      error: () => this.swal.error('Error', 'No se pudieron cargar las cuentas.')
    });
  }

  // búsqueda con debounce simple (sin Rx extra)
  private _t: any;
  onBuscar(term: string) {
    this.buscarTxt.set(term);
    clearTimeout(this._t);
    this._t = setTimeout(() => this.cargarLista(), 500);
  }

  setFiltro(f: Filtro) {
    if (this.filtro() === f) return;
    this.filtro.set(f);
    // no forzamos re-fetch: filtramos en cliente; si prefieres pedir al backend, llama a cargarLista()
  }

  // === FORM ===
  editar(c: Cuenta) {
    this.form.setValue({
      idCuenta: c.idCuenta,
      nombreCuenta: c.nombreCuenta,
      colorHexadecimal: (c.colorHexadecimal || '#22C55E').toUpperCase()
    });
  }

  limpiar() {
    this.form.reset({
      idCuenta: null,
      nombreCuenta: '',
      colorHexadecimal: '#22C55E'
    });
  }

  onColorHexChange(v: string) {
    if (!v) return;
    const up = v.toUpperCase();
    if (!up.startsWith('#')) this.f.colorHexadecimal.setValue('#' + up);
    else this.f.colorHexadecimal.setValue(up);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.swal.warn('Faltan datos', 'Completa los campos requeridos.');
      return;
    }

    const v = this.form.getRawValue();
    // enviamos solo lo que sabemos que el backend acepta
    const model = {
      idCuenta: v.idCuenta,
      idUsuario: this.idUsuario,
      nombreCuenta: (v.nombreCuenta || '').trim()
    };

    this.cargando.set(true);
    this.loader.show();
    this.ctaSrv.Guardar(model).pipe(
      finalize(() => { this.cargando.set(false); this.loader.hide(); })
    ).subscribe({
      next: (r: any) => {
        if (r?.successful) {
          this.swal.success('¡Listo!', this.editando() ? 'Cuenta actualizada.' : 'Cuenta creada.');
          this.limpiar();
          this.cargarLista();
        } else {
          this.swal.warn('No se pudo guardar', r?.message || 'Intenta nuevamente.');
        }
      },
      error: (err) => this.swal.error('Error al guardar', err?.error?.message || 'Ocurrió un error inesperado.')
    });
  }

  toggleEstatus(c: Cuenta) {
    const activar = (c.estatus ?? 'A') === 'I';
    const titulo  = activar ? 'Activar cuenta' : 'Desactivar cuenta';
    const texto   = activar
      ? `¿Activar "${c.nombreCuenta}"?`
      : `¿Desactivar "${c.nombreCuenta}"?`;

    this.swal.confirm(titulo, texto).then(ok => {
      // ✅ no hacer nada si cancelan o cierran
      if (!ok) return;

      this.loader.show();
      this.ctaSrv.CambiarEstatus({
        idUsuario: this.idUsuario,
        idCuenta: c.idCuenta,
        estatus: activar ? 'A' : 'I'
      }).pipe(
        finalize(() => this.loader.hide())
      ).subscribe({
        next: (r: any) => {
          if (r?.successful) {
            this.swal.success('Hecho', r?.message || (activar ? 'Cuenta activada.' : 'Cuenta desactivada.'));
            // refrescamos localmente para evitar otro fetch si quieres
            this.cuentas.update(arr => arr.map(x => x.idCuenta === c.idCuenta ? { ...x, estatus: activar ? 'A' : 'I' } : x));
          } else {
            this.swal.warn('No se pudo cambiar el estatus', r?.message || 'Intenta nuevamente.');
          }
        },
        error: () => this.swal.error('Error', 'No se pudo cambiar el estatus.')
      });
    });
  }
}
