import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';
import { Subscription, startWith as rxStartWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthService } from '../../services/AuthService.service';
import { LoaderService } from '../../services/loader.service';
import { SwalService } from '../../services/swal.service';
import { CategoriaService } from '../../services/Categoria.service';

type Categoria = {
  idCategoria: number;
  idUsuario: number;
  nombreCategoria: string;
  tipoCategoria: 0 | 1;               // 0=gasto, 1=ingreso
  colorHexadecimal?: string | null;
  estatus?: 'A' | 'I';
};

type FiltroTipo = 'todas' | 'gasto' | 'ingreso' | 'inactivas';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './categorias.html'
})
export class Categorias implements OnInit, OnDestroy {
  private fb         = inject(FormBuilder);
  private auth       = inject(AuthService);
  private catSrv     = inject(CategoriaService);
  private loader     = inject(LoaderService);
  private swal       = inject(SwalService);

  private subs = new Subscription();

  user = this.auth.getUsuario();
  idUsuario = this.user?.idUsuario ?? 0;

  // estado
  categorias = signal<Categoria[]>([]);
  cargando   = signal(false);

  // búsqueda / filtro
  filtroTipo  = signal<FiltroTipo>('todas');
  buscarCtrl  = this.fb.control<string>('', { nonNullable: true });
  buscarTxt   = signal<string>(''); // estado derivado para backend

  // form (crear/editar) — idCategoria nullable para detectar edición
  form = this.fb.group({
    idCategoria: this.fb.control<number | null>(null),
    nombreCategoria: this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    tipoCategoria: this.fb.control<0 | 1>(0, { nonNullable: true }),
    colorHexadecimal: this.fb.control('#22C55E', { nonNullable: true })
  });
  get f() { return this.form.controls; }

  // Para que el título reaccione siempre al modo edición
  private idCatSig = toSignal(
    this.f.idCategoria.valueChanges.pipe(rxStartWith(this.f.idCategoria.value)),
    { initialValue: this.f.idCategoria.value }
  );
  editando = computed(() => this.idCatSig() != null);

  // listado filtrado en cliente
  listaFiltrada = computed(() => {
    const q = this.buscarTxt().trim().toLowerCase();
    const f = this.filtroTipo();
    let arr = this.categorias();

    if (f === 'inactivas') {
      arr = arr.filter(x => x.estatus === 'I');
    } else {
      if (f === 'gasto')   arr = arr.filter(x => x.tipoCategoria === 0);
      if (f === 'ingreso') arr = arr.filter(x => x.tipoCategoria === 1);
    }

    if (q) {
      arr = arr.filter(x => (x.nombreCategoria || '').toLowerCase().includes(q));
    }
    return [...arr].sort((a, b) => a.nombreCategoria.localeCompare(b.nombreCategoria));
  });

  ngOnInit(): void {
    // Debounce de búsqueda: solo llama al backend cuando el usuario deja de escribir
    this.subs.add(
      this.buscarCtrl.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged()
      ).subscribe(term => {
        this.buscarTxt.set(term);
        this.cargarLista();
      })
    );

    // Primera carga
    this.buscarTxt.set(this.buscarCtrl.value);
    this.cargarLista();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // === DATA ===
  private asList(r: any): Categoria[] {
    const raw = Array.isArray(r) ? r : (r?.dataList ?? r ?? []);
    return (raw || []) as Categoria[];
  }

  cargarLista() {
    this.cargando.set(true);
    const soloActivas = this.filtroTipo() !== 'inactivas';
    const buscar = this.buscarTxt().trim() || undefined;

    this.loader.show();
    this.catSrv.Listar(this.idUsuario, soloActivas, buscar).pipe(
      finalize(() => { this.cargando.set(false); this.loader.hide(); })
    ).subscribe({
      next: (r:any) => this.categorias.set(this.asList(r)),
      error: () => this.swal.error('Error', 'No se pudieron cargar las categorías.')
    });
  }

  setFiltro(f: FiltroTipo) {
    if (this.filtroTipo() === f) return;
    this.filtroTipo.set(f);
    this.cargarLista();
  }

  // === FORM ===
  editar(cat: Categoria) {
    this.form.setValue({
      idCategoria: cat.idCategoria,
      nombreCategoria: cat.nombreCategoria,
      tipoCategoria: cat.tipoCategoria,
      colorHexadecimal: (cat.colorHexadecimal || '#22C55E').toUpperCase()
    });
  }

  limpiar() {
    this.form.reset({
      idCategoria: null,
      nombreCategoria: '',
      tipoCategoria: 0,
      colorHexadecimal: '#22C55E'
    });
  }

  onColorHexChange(v: string) {
    if (!v) return;
    const up = v.toUpperCase();
    if (!up.startsWith('#')) this.f.colorHexadecimal.setValue('#' + up);
    else this.f.colorHexadecimal.setValue(up);
  }

  setTipo(v: 0 | 1) { this.f.tipoCategoria.setValue(v); }

  segBtnClass(sel: boolean) {
    return sel
      ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-400/40 shadow-sm'
      : 'bg-slate-900/40 text-slate-200 border-white/10 hover:bg-slate-800/60';
  }
  segBtnClassIn(sel: boolean) {
    return sel ? 'bg-white' : 'bg-rose-400/60';
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.swal.warn('Faltan datos', 'Completa los campos requeridos.');
      return;
    }

    const v = this.form.getRawValue();
    const model = {
      idCategoria: v.idCategoria,
      idUsuario: this.idUsuario,
      nombreCategoria: (v.nombreCategoria || '').trim(),
      tipoCategoria: v.tipoCategoria as 0 | 1,
      colorHexadecimal: (v.colorHexadecimal || '').toUpperCase()
    };

    this.cargando.set(true);
    this.loader.show();
    this.catSrv.Guardar(model).pipe(
      finalize(() => { this.cargando.set(false); this.loader.hide(); })
    ).subscribe({
      next: (r:any) => {
        if (r?.successful) {
          this.swal.success('¡Listo!', this.editando() ? 'Categoría actualizada.' : 'Categoría creada.');
          this.limpiar();
          this.cargarLista();
        } else {
          this.swal.warn('No se pudo guardar', r?.message || 'Intenta nuevamente.');
        }
      },
      error: (err) => this.swal.error('Error al guardar', err?.error?.message || 'Ocurrió un error inesperado.')
    });
  }

  // ✅ NO cambia si cancelas/cierra el modal
  async toggleEstatus(cat: Categoria) {
    const activar = (cat.estatus ?? 'A') === 'I';
    const titulo  = activar ? 'Activar categoría' : 'Desactivar categoría';
    const texto   = activar
      ? `¿Activar "${cat.nombreCategoria}"?`
      : `¿Desactivar "${cat.nombreCategoria}"?`;

    const res: any = await this.swal.confirm(titulo, texto);
    const confirmed = res === true || res?.isConfirmed === true || res?.value === true;
    if (!confirmed) return;

    this.loader.show();
    this.catSrv.CambiarEstatus({
      idUsuario: this.idUsuario,
      idCategoria: cat.idCategoria,
      estatus: activar ? 'A' : 'I'
    }).pipe(
      finalize(() => this.loader.hide())
    ).subscribe({
      next: (r:any) => {
        if (r?.successful) {
          this.swal.success('Hecho', r?.message || (activar ? 'Categoría activada.' : 'Categoría desactivada.'));
          this.cargarLista();
        } else {
          this.swal.warn('No se pudo cambiar el estatus', r?.message || 'Intenta nuevamente.');
        }
      },
      error: () => this.swal.error('Error', 'No se pudo cambiar el estatus.')
    });
  }

  // Utilidad: color aleatorio agradable
  randomColor() {
    const palette = ['#22C55E','#10B981','#0EA5E9','#6366F1','#F59E0B','#EF4444','#84CC16','#14B8A6','#F472B6','#A855F7'];
    const pick = palette[Math.floor(Math.random()*palette.length)];
    this.f.colorHexadecimal.setValue(pick);
  }

  // Forzar búsqueda inmediata (por Enter o botón)
  buscarAhora() {
    this.buscarTxt.set(this.buscarCtrl.value);
    this.cargarLista();
  }
}
