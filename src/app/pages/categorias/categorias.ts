import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../services/AuthService.service';
import { LoaderService } from '../../services/loader.service';
import { ToastService } from '../../services/toast.service';
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
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './categorias.html'
})
export class Categorias implements OnInit {
  private fb         = inject(FormBuilder);
  private auth       = inject(AuthService);
  private catSrv     = inject(CategoriaService);
  private loader     = inject(LoaderService);
  private toast      = inject(ToastService);
  private swal       = inject(SwalService);

  user = this.auth.getUsuario();
  idUsuario = this.user?.idUsuario ?? 0;

  // estado
  categorias = signal<Categoria[]>([]);
  cargando   = signal(false);

  // búsqueda / filtro
  buscarTxt   = signal<string>('');
  filtroTipo  = signal<FiltroTipo>('todas');

  // listado filtrado en cliente
  listaFiltrada = computed(() => {
    const q = this.buscarTxt().trim().toLowerCase();
    const f = this.filtroTipo();
    let arr = this.categorias();

    if (f === 'inactivas') {
      arr = arr.filter(x => x.estatus === 'I');
    } else {
      // el backend ya devuelve solo activas cuando pedimos soloActivas=true
      // igual filtramos por tipo si aplica:
      if (f === 'gasto')   arr = arr.filter(x => x.tipoCategoria === 0);
      if (f === 'ingreso') arr = arr.filter(x => x.tipoCategoria === 1);
    }

    if (q) {
      arr = arr.filter(x => (x.nombreCategoria || '').toLowerCase().includes(q));
    }
    return [...arr].sort((a, b) => a.nombreCategoria.localeCompare(b.nombreCategoria));
  });

  // form (crear/editar)
  form = this.fb.nonNullable.group({
    idCategoria:  null as number | null,
    nombreCategoria: ['', [Validators.required, Validators.minLength(2)]],
    tipoCategoria: 0 as 0 | 1,  // por defecto Gasto
    colorHexadecimal: '#22c55e' // Emerald por defecto
  });

  get f() { return this.form.controls; }
  editando = computed(() => this.f.idCategoria.value != null);

  ngOnInit(): void {
    this.cargarLista();
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
      error: () => this.toast.danger('No se pudieron cargar las categorías')
    });
  }

  onBuscar(term: string) {
    this.buscarTxt.set(term);
    // debounce simple
    clearTimeout((this as any)._t);
    (this as any)._t = setTimeout(() => this.cargarLista(), 300);
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
      colorHexadecimal: (cat.colorHexadecimal || '#22c55e').toUpperCase()
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

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warn('Completa los campos requeridos');
      return;
    }

    const v = this.form.getRawValue();
    const model = {
      idCategoria: v.idCategoria,
      idUsuario: this.idUsuario,
      nombreCategoria: v.nombreCategoria.trim(),
      tipoCategoria: v.tipoCategoria,
      colorHexadecimal: (v.colorHexadecimal || '').toUpperCase()
    };

    this.cargando.set(true);
    this.loader.show();
    this.catSrv.Guardar(model).pipe(
      finalize(() => { this.cargando.set(false); this.loader.hide(); })
    ).subscribe({
      next: (r:any) => {
        if (r?.successful) {
          this.toast.success(this.editando() ? 'Categoría actualizada' : 'Categoría creada');
          this.limpiar();
          this.cargarLista();
        } else {
          this.toast.warn(r?.message || 'No se pudo guardar');
        }
      },
      error: (err) => this.toast.danger(err?.error?.message || 'Error al guardar')
    });
  }

  toggleEstatus(cat: Categoria) {
    const activar = (cat.estatus ?? 'A') === 'I';
    const titulo  = activar ? 'Activar categoría' : 'Desactivar categoría';
    const texto   = activar
      ? `¿Activar "${cat.nombreCategoria}"?`
      : `¿Desactivar "${cat.nombreCategoria}"?`;

    this.swal.confirm(titulo, texto).then(ok => {
      if (!ok) return;

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
            this.toast.info(r?.message || (activar ? 'Categoría activada' : 'Categoría desactivada'));
            this.cargarLista();
          } else {
            this.toast.warn(r?.message || 'No se pudo cambiar el estatus');
          }
        },
        error: () => this.toast.danger('Error al cambiar estatus')
      });
    });
  }
}
