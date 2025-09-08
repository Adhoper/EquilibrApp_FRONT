import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/AuthService.service';
import { TransaccionService } from '../../services/Transaccion.service';
import { CuentaService } from '../../services/Cuenta.service';
import { CategoriaService } from '../../services/Categoria.service';
import { AlertaService } from '../../services/alerta.service';
import { ToastService, ToastLevel } from '../../services/toast.service';
import { SwalService } from '../../services/swal.service';
import { LoaderService } from '../../services/loader.service';

import { finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

type Opcion = { id: number; nombre: string };
type TxItem = {
  idTransaccion: number;
  tipoTransaccion: 0 | 1;
  monto: number;
  fechaTransaccion: string;
  categoria: string;
  cuenta: string;
  nota?: string | null;
};

@Component({
  selector: 'app-transacciones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './transacciones.html'
})
export class Transacciones implements OnInit, OnDestroy {
  private fb        = inject(FormBuilder);
  private auth      = inject(AuthService);
  private txSrv     = inject(TransaccionService);
  private ctaSrv    = inject(CuentaService);
  private catSrv    = inject(CategoriaService);
  private alertaSrv = inject(AlertaService);
  private toast     = inject(ToastService);
  private swal      = inject(SwalService);
  private loader    = inject(LoaderService);

  private subs = new Subscription();

  user = this.auth.getUsuario();
  idUsuario = this.user?.idUsuario ?? 0;

  categorias = signal<Opcion[]>([]);
  cuentas    = signal<Opcion[]>([]);
  recientes  = signal<TxItem[]>([]);
  cargando   = signal(false);

  // ---- Formulario ----
  form = this.fb.nonNullable.group({
    tipoTransaccion: 0 as 0 | 1,
    monto: ['', [Validators.required, Validators.min(0.01)]],
    idCuenta: null as number | null,
    idCategoria: null as number | null,
    fechaTransaccion: this.hoyISO(),
    nota: ''
  });
  get f() { return this.form.controls; }

  private tipoSig = toSignal(
    this.f.tipoTransaccion.valueChanges.pipe(startWith(this.f.tipoTransaccion.value)),
    { initialValue: this.f.tipoTransaccion.value }
  );
  isIngreso = computed(() => this.tipoSig() === 1);
  titulo    = computed(() => (this.isIngreso() ? 'Nuevo ingreso' : 'Nuevo gasto'));

  // ---- Listado completo (tabla) ----
  periodo   = signal(this.periodoActual());
  buscarCtrl = this.fb.control<string>('', { nonNullable: true });
  buscar     = signal<string>('');
  pagina     = signal(1);
  tamPagina  = 10;             // ✅ 10 por página
  total      = signal(0);
  lista      = signal<TxItem[]>([]);

  ngOnInit(): void {
    this.cargarSelects();
    this.cargarRecientes();

    // Debounce de búsqueda
    this.subs.add(
      this.buscarCtrl.valueChanges
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe(v => {
          this.buscar.set(v);
          this.pagina.set(1);
          this.cargarListado();
        })
    );

    // Primera carga
    this.buscar.set(this.buscarCtrl.value);
    this.cargarListado();
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  // ------ Cargas auxiliares ------
  private cargarSelects() {
    this.loader.show();
    this.catSrv.Listar(this.idUsuario).pipe(
      finalize(() => this.loader.hide())
    ).subscribe({
      next: (r: any) => {
        const list = r?.dataList ?? r ?? [];
        this.categorias.set(list.map((x: any) => ({ id: x.idCategoria, nombre: x.nombreCategoria })));
      },
      error: () => this.swal.error('Error', 'No se pudieron cargar las categorías.')
    });

    this.loader.show();
    this.ctaSrv.Listar(this.idUsuario).pipe(
      finalize(() => this.loader.hide())
    ).subscribe({
      next: (r: any) => {
        const list = r?.dataList ?? r ?? [];
        const mapped = list.map((x: any) => ({ id: x.idCuenta, nombre: x.nombreCuenta }));
        this.cuentas.set(mapped);
        if (!this.f.idCuenta.value && mapped.length) this.f.idCuenta.setValue(mapped[0].id);
      },
      error: () => this.swal.error('Error', 'No se pudieron cargar las cuentas.')
    });
  }

  private cargarRecientes() {
    const periodo = this.periodoActual();
    this.loader.show();
    this.txSrv.Listar({
      IdUsuario: this.idUsuario, periodo, pagina: 1, tamPagina: 10, soloActivas: true
    }).pipe(
      finalize(() => this.loader.hide())
    ).subscribe({
      next: (r: any) => {
        const list = (r?.dataList ?? r ?? []).map(this.mapTx) as TxItem[];
        this.recientes.set(list);
      },
      error: () => this.swal.error('Error', 'No se pudieron cargar las transacciones recientes.')
    });
  }

  // Listado paginado (todas las transacciones del periodo)
  cargarListado() {
    this.loader.show();
    this.txSrv.Listar({
      IdUsuario: this.idUsuario,
      periodo: this.periodo(),
      pagina: this.pagina(),
      tamPagina: this.tamPagina,
      soloActivas: true,
      buscar: this.buscar() || undefined
    }).pipe(
      finalize(() => this.loader.hide())
    ).subscribe({
      next: (r: any) => {
        const src  = r?.dataList ?? r ?? [];
        const list = (Array.isArray(src) ? src : []).map(this.mapTx) as TxItem[];
        // ✅ intenta leer el total desde varias claves comunes
        const total = this.getTotal(r, list.length);
        this.lista.set(list);
        this.total.set(total);
      },
      error: () => this.swal.error('Error', 'No se pudo cargar el listado de transacciones.')
    });
  }

  // 🔎 extrae el total desde diferentes propiedades que pueda enviar el API
  private getTotal(r: any, fallback: number): number {
    return (
      r?.total ??
      r?.totalCount ??
      r?.totalItems ??
      r?.count ??
      r?.cantidadTotal ??
      r?.totalRegistros ??
      r?.recordsTotal ??
      r?.pagination?.total ??
      fallback
    );
  }

  // Normaliza propiedades para evitar vacíos
  private mapTx = (x: any): TxItem => ({
    idTransaccion: x.idTransaccion,
    tipoTransaccion: x.tipoTransaccion as 0 | 1,
    monto: Number(x.monto ?? 0),
    fechaTransaccion: x.fechaTransaccion,
    categoria: x.categoria ?? x.nombreCategoria ?? x.categoriaNombre ?? '',
    cuenta: x.cuenta ?? x.nombreCuenta ?? x.cuentaNombre ?? '',
    nota: x.nota ?? x.descripcion ?? null
  });

  // ---- Acciones de UI ----
  setTipo(v: 0 | 1) { this.f.tipoTransaccion.setValue(v); }

  prevMes() { this.periodo.set(this.shiftMes(this.periodo(), -1)); this.pagina.set(1); this.cargarListado(); }
  nextMes() { this.periodo.set(this.shiftMes(this.periodo(), 1));  this.pagina.set(1); this.cargarListado(); }

  buscarAhora() { this.buscar.set(this.buscarCtrl.value); this.pagina.set(1); this.cargarListado(); }
  limpiarBuscar() { this.buscarCtrl.setValue(''); }

  irPag(delta: number) {
    const nueva = Math.max(1, this.pagina() + delta);
    this.pagina.set(nueva);
    this.cargarListado();
  }

  // Scroll desde “Ver todas”
  scrollToAll() {
    const el = document.getElementById('all-transacciones');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- Guardar ----
  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.swal.warn('Faltan datos', 'Completa los campos requeridos.');
      return;
    }

    const v = this.form.getRawValue();
    const model = {
      idTransaccion: null,
      idUsuario: this.idUsuario,
      idCuenta: v.idCuenta as number,
      idCategoria: v.idCategoria as number,
      tipoTransaccion: v.tipoTransaccion as 0 | 1,
      monto: Number(v.monto),
      fechaTransaccion: v.fechaTransaccion,
      nota: v.nota?.trim() || null
    };

    this.cargando.set(true);
    this.loader.show();
    this.txSrv.Guardar(model).pipe(
      finalize(() => { this.cargando.set(false); this.loader.hide(); })
    ).subscribe({
      next: (res: any) => {
        if (res?.successful) {
          this.swal.success('Transacción guardada', res?.message);
          this.resetForm(model.tipoTransaccion);
          this.cargarRecientes();
          this.cargarListado();
          this.refrescarAlertasConToasts(model.idCategoria);
        } else {
          this.swal.warn('No se pudo guardar', res?.message || 'Intenta nuevamente.');
        }
      },
      error: (err) => {
        this.swal.error('Error al guardar', err?.error?.message || 'Ocurrió un error inesperado.');
      }
    });
  }

  resetForm(tipo: 0 | 1 = this.f.tipoTransaccion.value) {
    this.form.reset({
      tipoTransaccion: tipo,
      monto: '',
      idCuenta: this.cuentas()[0]?.id ?? null,
      idCategoria: null,
      fechaTransaccion: this.hoyISO(),
      nota: ''
    });
  }

  /** Tras guardar: genera/actualiza alertas y muestra toasts SOLO para las nuevas */
  private refrescarAlertasConToasts(idCategoria?: number) {
    const periodo = this.periodoActual();
    const prev = new Set(this.alertaSrv.alertas().map(a => a.idAlerta));

    this.alertaSrv.revisar(this.idUsuario, periodo, idCategoria).subscribe((r: any) => {
      this.alertaSrv.mergeFromResponse(r);
      const lista = (r?.dataList ?? r ?? []) as any[];
      lista
        .filter(a => a.estado === 'N' && !prev.has(a.idAlerta))
        .forEach(a => {
          const msg = a.tipo === 'C'
            ? `Alerta: ${a.categoria || 'Categoría'} alcanzó ${a.umbral}%`
            : `Alerta: presupuesto global alcanzó ${a.umbral}%`;
          const level: ToastLevel = a.umbral >= 100 ? 'danger' : a.umbral >= 90 ? 'high' : 'warn';
          this.toast.show(msg, level, {
            actionText: 'Ver presupuestos',
            action: () => (location.href = '/presupuestos')
          });
        });
    });
  }

  // ---- Helpers ----
  invalid(ctrl: string) {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
  hoyISO() { const d = new Date(); return d.toISOString().slice(0, 10); }
  periodoActual() { const d = new Date(); const m = String(d.getMonth()+1).padStart(2,'0'); return `${d.getFullYear()}-${m}`; }

  fmtPeriodo(p: string) {
    const [y, m] = p.split('-').map(Number);
    const d = new Date(y, (m ?? 1) - 1, 1);
    return d.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
  }
  private shiftMes(p: string, delta: number) {
    const [y, m] = p.split('-').map(Number);
    const d = new Date(y, (m - 1) + delta, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    return ym;
  }
}
