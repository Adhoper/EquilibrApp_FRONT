import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Subscription, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthService } from '../../services/AuthService.service';
import { LoaderService } from '../../services/loader.service';
import { SwalService } from '../../services/swal.service';
import { PresupuestoService } from '../../services/Presupuesto.service';
import { CategoriaService } from '../../services/Categoria.service';

type Opcion = { id: number; nombre: string; colorHexadecimal?: string | null };

type Presupuesto = {
  idPresupuesto: number;
  idUsuario: number;
  idCategoria: number;
  periodo: string;               // 'YYYY-MM'
  montoLimite: number;
  estatus?: 'A' | 'I';
  categoria: string;
  colorHexadecimal?: string | null;
};

type UsoCategoria = {
  idCategoria: number;
  categoria: string;
  gastado: number;
  limite: number;       // puede venir 0; lo usamos para % si el API lo trae
  porcentaje: number;   // si no viene, lo calculamos
};

type GlobalUso = { limite: number; gastado: number; porcentaje: number; restante: number };

@Component({
  selector: 'app-presupuestos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './presupuestos.html'
})
export class Presupuestos implements OnInit, OnDestroy {
  private fb       = inject(FormBuilder);
  private auth     = inject(AuthService);
  private loader   = inject(LoaderService);
  private swal     = inject(SwalService);
  private pSrv     = inject(PresupuestoService);
  private catSrv   = inject(CategoriaService);

  private subs = new Subscription();

  user = this.auth.getUsuario();
  idUsuario = this.user?.idUsuario ?? 0;

  // Estado base
  periodo   = signal(this.periodoActual());
  categorias = signal<Opcion[]>([]);
  presupuestos = signal<Presupuesto[]>([]);
  usoCategorias = signal<UsoCategoria[]>([]);
  globalUso = signal<GlobalUso>({ limite: 0, gastado: 0, porcentaje: 0, restante: 0 });
  soloActivos = signal(true);
  cargando = signal(false);

  // Form de presupuesto por categoría
  form = this.fb.group({
    idPresupuesto: this.fb.control<number | null>(null),
    idCategoria: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    montoLimite: this.fb.control<number | null>(null, { validators: [Validators.required, Validators.min(1)] })
  });
  get f() { return this.form.controls; }

  private idPresSig = toSignal(
    this.f.idPresupuesto.valueChanges.pipe(startWith(this.f.idPresupuesto.value)),
    { initialValue: this.f.idPresupuesto.value }
  );
  editando = computed(() => this.idPresSig() != null);

  // Form presupuesto global
  formGlobal = this.fb.group({
    montoLimiteGlobal: this.fb.control<number | null>(null, { validators: [Validators.required, Validators.min(1)] })
  });
  get fg() { return this.formGlobal.controls; }

  ngOnInit(): void {
    this.cargarSelects();
    this.cargarTodo();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ===== CARGAS =====
  private cargarSelects() {
    this.loader.show();
    this.catSrv.Listar(this.idUsuario, true).pipe(
      finalize(() => this.loader.hide())
    ).subscribe({
      next: (r: any) => {
        const list = (r?.dataList ?? r ?? []) as any[];
        this.categorias.set(list.map(x => ({
          id: x.idCategoria, nombre: x.nombreCategoria, colorHexadecimal: x.colorHexadecimal
        })));
      },
      error: () => this.swal.error('Error', 'No se pudieron cargar las categorías.')
    });
  }

  private cargarTodo() {
    this.cargarListado();
    this.cargarUsoPorCategoria();
    this.cargarGlobal();
  }

presupuestosFiltrados = computed(() => {
    const soloA = this.soloActivos(); // true=Activos, false=Inactivos
    return this.presupuestos()
      .filter(p => (p.estatus ?? 'A') === (soloA ? 'A' : 'I'))
      .sort((a, b) => a.categoria.localeCompare(b.categoria));
  });

  private cargarListado() {
    this.cargando.set(true);
    this.loader.show();
    // ✅ pedimos todo (false) y filtramos en cliente para que el toggle funcione perfecto
    this.pSrv.Listar(this.idUsuario, this.periodo(), false).pipe(
      finalize(() => { this.cargando.set(false); this.loader.hide(); })
    ).subscribe({
      next: (r: any) => {
        const raw = Array.isArray(r) ? r : (r?.dataList ?? r ?? []);
        const lista = (raw || []).map((x: any): Presupuesto => ({
          idPresupuesto: x.idPresupuesto,
          idUsuario: x.idUsuario ?? this.idUsuario,
          idCategoria: x.idCategoria,
          periodo: x.periodo ?? this.periodo(),
          montoLimite: Number(x.montoLimite ?? x.limite ?? 0),
          estatus: x.estatus ?? 'A',
          categoria: x.categoria ?? x.nombreCategoria ?? '',
          colorHexadecimal: x.colorHexadecimal ?? null
        }));
        this.presupuestos.set(lista);
      },
      error: () => this.swal.error('Error', 'No se pudo cargar el listado de presupuestos.')
    });
  }

  private cargarUsoPorCategoria() {
    this.loader.show();
    this.pSrv.UsoPorCategoria(this.idUsuario, this.periodo()).pipe(
      finalize(() => this.loader.hide())
    ).subscribe({
      next: (r: any) => {
        const raw = Array.isArray(r) ? r : (r?.dataList ?? r ?? []);
        const lista = (raw || []).map((x: any): UsoCategoria => {
          const gastado = Number(x.montoGastado ?? x.gastado ?? x.usado ?? 0);
          const limite  = Number(x.montoLimite ?? x.limite ?? 0);
          const pct     = Number(x.porcentaje ?? (limite > 0 ? (gastado / limite) * 100 : 0));
          return {
            idCategoria: x.idCategoria,
            categoria: x.categoria ?? x.nombreCategoria ?? '',
            gastado,
            limite,
            porcentaje: pct
          };
        });
        this.usoCategorias.set(lista);
      },
      error: () => this.swal.error('Error', 'No se pudo cargar el uso por categoría.')
    });
  }

private cargarGlobal() {
  this.loader.show();
  this.pSrv.UsoGlobal(this.idUsuario, this.periodo()).pipe(
    finalize(() => this.loader.hide())
  ).subscribe({
    next: (r: any) => {
      // Puede venir como objeto directo, dentro de data/singleData o como primer row
      const raw = (r?.data ?? r?.singleData ?? r);
      const obj = Array.isArray(raw) ? (raw[0] ?? {}) : (raw ?? {});

      const gastado = Number(
        obj.montoGastado ?? obj.gastadoTotal ?? obj.GastadoTotal ?? obj.gastado ?? obj.usado ?? 0
      );
      const limite = Number(
        obj.montoLimiteGlobal ?? obj.MontoLimiteGlobal ?? obj.limite ?? obj.montoLimite ?? 0
      );
      const porcentaje = Number(
        obj.porcentaje ?? obj.porcentajeUsoGlobal ?? obj.PorcentajeUsoGlobal
        ?? (limite > 0 ? (gastado / limite) * 100 : 0)
      );

      const restante = limite - gastado;
      this.globalUso.set({
        limite,
        gastado,
        porcentaje: this.clamp(porcentaje),
        restante
      });

      if (limite > 0) this.fg.montoLimiteGlobal.setValue(limite);
    },
    error: () => this.swal.error('Error', 'No se pudo cargar el uso global.')
  });
}


  // ===== ACCIONES UI =====
  prevMes() { this.periodo.set(this.shiftMes(this.periodo(), -1)); this.limpiarForm(); this.cargarTodo(); }
  nextMes() { this.periodo.set(this.shiftMes(this.periodo(), 1));  this.limpiarForm(); this.cargarTodo(); }

setSoloActivos(v: boolean) {
    if (this.soloActivos() === v) return;
    this.soloActivos.set(v);
  }

  editar(p: Presupuesto) {
    this.form.setValue({
      idPresupuesto: p.idPresupuesto,
      idCategoria: p.idCategoria,
      montoLimite: p.montoLimite
    });
    // desplazarse al formulario (opcional)
    setTimeout(() => document.querySelector('form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  limpiarForm() {
    this.form.reset({ idPresupuesto: null, idCategoria: null, montoLimite: null });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.swal.warn('Faltan datos', 'Completa los campos requeridos.');
      return;
    }

    const v = this.form.getRawValue();
    const model = {
      idPresupuesto: v.idPresupuesto,
      idUsuario: this.idUsuario,
      idCategoria: v.idCategoria as number,
      periodo: this.periodo(),
      montoLimite: Number(v.montoLimite)
    };

    this.cargando.set(true);
    this.loader.show();
    this.pSrv.Guardar(model).pipe(
      finalize(() => { this.cargando.set(false); this.loader.hide(); })
    ).subscribe({
      next: (r: any) => {
        if (r?.successful) {
          this.swal.success('¡Listo!', this.editando() ? 'Presupuesto actualizado.' : 'Presupuesto creado.');
          this.limpiarForm();
          this.cargarListado();
          this.cargarUsoPorCategoria();
          this.cargarGlobal();
        } else {
          this.swal.warn('No se pudo guardar', r?.message || 'Intenta nuevamente.');
        }
      },
      error: (err) =>
        this.swal.error('Error al guardar', err?.error?.message || 'Ocurrió un error inesperado.')
    });
  }

  async toggleEstatus(p: Presupuesto) {
    const activar = (p.estatus ?? 'A') === 'I';
    const titulo  = activar ? 'Activar presupuesto' : 'Desactivar presupuesto';
    const texto   = activar
      ? `¿Activar presupuesto de "${p.categoria}"?`
      : `¿Desactivar presupuesto de "${p.categoria}"?`;

    const res: any = await this.swal.confirm(titulo, texto);
    const confirmed = res === true || res?.isConfirmed === true || res?.value === true;
    if (!confirmed) return;

    this.loader.show();
    this.pSrv.CambiarEstatus({
      idUsuario: this.idUsuario,
      idPresupuesto: p.idPresupuesto,
      estatus: activar ? 'A' : 'I'
    }).pipe(
      finalize(() => this.loader.hide())
    ).subscribe({
      next: (r: any) => {
        if (r?.successful) {
          this.swal.success('Hecho', r?.message || (activar ? 'Presupuesto activado.' : 'Presupuesto desactivado.'));
          this.cargarListado();
        } else {
          this.swal.warn('No se pudo cambiar el estatus', r?.message || 'Intenta nuevamente.');
        }
      },
      error: () => this.swal.error('Error', 'No se pudo cambiar el estatus.')
    });
  }

  guardarGlobal() {
    if (this.formGlobal.invalid) {
      this.formGlobal.markAllAsTouched();
      this.swal.warn('Faltan datos', 'Ingresa un límite global válido.');
      return;
    }

    const model = {
      idUsuario: this.idUsuario,
      periodo: this.periodo(),
      montoLimiteGlobal: Number(this.fg.montoLimiteGlobal.value)
    };

    this.cargando.set(true);
    this.loader.show();
    this.pSrv.GuardarGlobal(model).pipe(
      finalize(() => { this.cargando.set(false); this.loader.hide(); })
    ).subscribe({
      next: (r: any) => {
        if (r?.successful) {
          this.swal.success('¡Listo!', 'Presupuesto global guardado.');
          this.cargarGlobal();
          this.cargarUsoPorCategoria();
        } else {
          this.swal.warn('No se pudo guardar', r?.message || 'Intenta nuevamente.');
        }
      },
      error: (err) =>
        this.swal.error('Error al guardar', err?.error?.message || 'Ocurrió un error inesperado.')
    });
  }

  // ===== HELPERS =====
  usoDe(idCategoria: number): { gastado: number; porcentaje: number } {
    const u = this.usoCategorias().find(x => x.idCategoria === idCategoria);
    if (!u) return { gastado: 0, porcentaje: 0 };
    return { gastado: u.gastado ?? 0, porcentaje: u.porcentaje ?? 0 };
  }

  pillClass(pct: number) {
    const v = this.clamp(pct);
    return v >= 100
      ? 'border-rose-500/40 text-rose-300'
      : v >= 80
        ? 'border-amber-500/40 text-amber-300'
        : 'border-emerald-500/40 text-emerald-300';
  }
  barClass(pct: number) {
    const v = this.clamp(pct);
    return v >= 100
      ? 'bg-rose-500/80'
      : v >= 80
        ? 'bg-amber-400/80'
        : 'bg-emerald-500/80';
  }
  clamp(v: number) { return Math.max(0, Math.min(100, Number(v || 0))); }

  invalid(ctrl: keyof typeof this.f) {
    const c = this.f[ctrl];
    return !!c && c.invalid && (c.touched || c.dirty);
  }
  invalidGlobal(ctrl: keyof typeof this.fg) {
    const c = this.fg[ctrl];
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  periodoActual() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${m}`;
  }
  fmtPeriodo(p: string) {
    const [y, m] = p.split('-').map(Number);
    const d = new Date(y, (m ?? 1) - 1, 1);
    return d.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
  }
  private shiftMes(p: string, delta: number) {
    const [y, m] = p.split('-').map(Number);
    const d = new Date(y, (m - 1) + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
