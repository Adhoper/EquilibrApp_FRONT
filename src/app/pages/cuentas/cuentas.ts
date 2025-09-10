import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthService } from '../../services/AuthService.service';
import { LoaderService } from '../../services/loader.service';
import { SwalService } from '../../services/swal.service';
import { ToastService } from '../../services/toast.service';
import { CuentaService } from '../../services/Cuenta.service';

type Cuenta = {
  idCuenta: number;
  idUsuario: number;
  nombreCuenta: string;
  saldoInicial?: number | null;
  estatus?: 'A' | 'I';
  colorHexadecimal?: string | null;
};

type Filtro = 'todas' | 'inactivas';

@Component({
  selector: 'app-cuentas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './cuentas.html'
})
export class Cuentas implements OnInit, OnDestroy {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private ctaSrv = inject(CuentaService);
  private loader = inject(LoaderService);
  private swal   = inject(SwalService);
  private toast  = inject(ToastService);

  private subs = new Subscription();

  user = this.auth.getUsuario();
  idUsuario = this.user?.idUsuario ?? 0;

  // state
  cuentas  = signal<Cuenta[]>([]);
  cargando = signal(false);

  // búsqueda / filtros
  buscarCtrl = this.fb.control<string>('', { nonNullable: true });
  buscarTxt  = signal<string>('');
  filtro     = signal<Filtro>('todas');

  // form (sin moneda)
  form = this.fb.group({
    idCuenta: this.fb.control<number | null>(null),
    nombreCuenta: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)]
    }),
    saldoInicial: this.fb.control<number>(0, {
      nonNullable: true,
      validators: [Validators.min(0)]
    }),
    // opcional / visual
    colorHexadecimal: this.fb.control<string>('#22C55E', { nonNullable: true })
  });
  get f() { return this.form.controls; }

  // título reactivo
  private idCuentaSig = toSignal(
    this.f.idCuenta.valueChanges.pipe(startWith(this.f.idCuenta.value)),
    { initialValue: this.f.idCuenta.value }
  );
  editando = computed(() => this.idCuentaSig() != null);

  // listado en cliente
  listaFiltrada = computed(() => {
    const arr = this.cuentas() || [];
    return [...arr].sort((a, b) => a.nombreCuenta.localeCompare(b.nombreCuenta));
  });

  ngOnInit(): void {
    // debounce de búsqueda
    this.subs.add(
      this.buscarCtrl.valueChanges
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe(v => {
          this.buscarTxt.set((v || '').trim());
          this.cargarLista();
        })
    );

    // primera carga
    this.buscarTxt.set(this.buscarCtrl.value.trim());
    this.cargarLista();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // === DATA ===
  private asList(r: any): Cuenta[] {
    const raw = Array.isArray(r) ? r : (r?.dataList ?? r ?? []);
    return (raw || []).map((x: any) => ({
      idCuenta: x.idCuenta,
      idUsuario: x.idUsuario ?? this.idUsuario,
      nombreCuenta: x.nombreCuenta ?? x.cuenta ?? '',
      saldoInicial: Number(x.saldoInicial ?? 0),
      estatus: x.estatus ?? 'A',
      colorHexadecimal: x.colorHexadecimal ?? null
    })) as Cuenta[];
  }

  cargarLista() {
    this.cargando.set(true);
    const soloActivas = this.filtro() !== 'inactivas';
    const buscar = this.buscarTxt().trim() || undefined;

    this.loader.show();
    this.ctaSrv.Listar(this.idUsuario, soloActivas, buscar).pipe(
      finalize(() => { this.cargando.set(false); this.loader.hide(); })
    ).subscribe({
      next: (r: any) => this.cuentas.set(this.asList(r)),
      error: () => this.swal.error('Error', 'No se pudieron cargar las cuentas.')
    });
  }

  setFiltro(f: Filtro) {
    if (this.filtro() === f) return;
    this.filtro.set(f);
    this.cargarLista();
  }

  // === FORM ===
  editar(c: Cuenta) {
    this.form.setValue({
      idCuenta: c.idCuenta,
      nombreCuenta: c.nombreCuenta,
      saldoInicial: Number(c.saldoInicial ?? 0),
      colorHexadecimal: (c.colorHexadecimal || '#22C55E').toUpperCase()
    });
  }

  limpiar() {
    this.form.reset({
      idCuenta: null,
      nombreCuenta: '',
      saldoInicial: 0,
      colorHexadecimal: '#22C55E'
    });
  }

  invalid(ctrl: keyof typeof this.f) {
    const c = this.f[ctrl];
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.swal.warn('Faltan datos', 'Completa los campos requeridos.');
      return;
    }

    const v = this.form.getRawValue();
    const model = {
      idCuenta: v.idCuenta,
      idUsuario: this.idUsuario,
      nombreCuenta: (v.nombreCuenta || '').trim(),
      saldoInicial: Number(v.saldoInicial ?? 0)
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

  async toggleEstatus(c: Cuenta) {
    const activar = (c.estatus ?? 'A') === 'I';
    const titulo  = activar ? 'Activar cuenta' : 'Desactivar cuenta';
    const texto   = activar ? `¿Activar "${c.nombreCuenta}"?` : `¿Desactivar "${c.nombreCuenta}"?`;

    const res: any = await this.swal.confirm(titulo, texto);
    const confirmed = res === true || res?.isConfirmed === true || res?.value === true;
    if (!confirmed) return;

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
          this.cargarLista();
        } else {
          this.swal.warn('No se pudo cambiar el estatus', r?.message || 'Intenta nuevamente.');
        }
      },
      error: () => this.swal.error('Error', 'No se pudo cambiar el estatus.')
    });
  }

  // Buscar inmediato (Enter/botón)
  buscarAhora() {
    this.buscarTxt.set(this.buscarCtrl.value);
    this.cargarLista();
  }
}
