import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';

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
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NgxPaginationModule],
  templateUrl: './transacciones.html',
})
export class Transacciones implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private txSrv = inject(TransaccionService);
  private ctaSrv = inject(CuentaService);
  private catSrv = inject(CategoriaService);
  private alertaSrv = inject(AlertaService);
  private toast = inject(ToastService);
  private swal = inject(SwalService);
  private loader = inject(LoaderService);

  private subs = new Subscription();

  user = this.auth.getUsuario();
  idUsuario = this.user?.idUsuario ?? 0;

  categorias = signal<Opcion[]>([]);
  cuentas = signal<Opcion[]>([]);
  recientes = signal<TxItem[]>([]);
  cargando = signal(false);

  // ---- Formulario ----
  form = this.fb.nonNullable.group({
    tipoTransaccion: 0 as 0 | 1,
    monto: ['', [Validators.required, Validators.min(0.01)]],
    idCuenta: null as number | null,
    idCategoria: null as number | null,
    fechaTransaccion: this.hoyISO(),
    nota: '',
  });
  get f() {
    return this.form.controls;
  }

  // para que el título reaccione 100%
  private tipoSig = toSignal(
    this.f.tipoTransaccion.valueChanges.pipe(startWith(this.f.tipoTransaccion.value)),
    { initialValue: this.f.tipoTransaccion.value }
  );
  isIngreso = computed(() => this.tipoSig() === 1);
  titulo = computed(() => (this.isIngreso() ? 'Nuevo ingreso' : 'Nuevo gasto'));

  // ------- Estado de la tabla (client-side paging) -------
  periodo = signal(this.periodoActual());
  buscarCtrl = this.fb.control<string>('', { nonNullable: true });
  buscar = signal<string>(''); // texto del input
  pagina = signal(1); // página visible
  tamPagina = 10; // items por página (visible)

  /** Lista completa (del servidor) del período actual */
  private origen = signal<TxItem[]>([]);

  filtradas = computed(() => {
    const q = (this.buscar() || '').toLowerCase().trim();
    if (!q) return this.origen();
    return this.origen().filter(
      (t) =>
        (t.categoria || '').toLowerCase().includes(q) ||
        (t.cuenta || '').toLowerCase().includes(q) ||
        (t.nota || '').toLowerCase().includes(q)
    );
  });

  /** totales derivados (sin depender del backend) */
  total = computed(() => this.filtradas().length);
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.tamPagina)));
  /** cuántos se muestran en la página actual */
  mostrados = () => {
    const start = (this.pagina() - 1) * this.tamPagina;
    return Math.max(0, Math.min(this.tamPagina, this.total() - start));
  };

  ngOnInit(): void {
    this.cargarSelects();
    this.cargarRecientes();

    // Debounce del buscador
    this.subs.add(
      this.buscarCtrl.valueChanges
        .pipe(debounceTime(400), distinctUntilChanged())
        .subscribe((v) => {
          this.buscar.set((v || '').trim());
          this.pagina.set(1); // siempre regreso a la primera
          // No llamo al backend: filtro en memoria
        })
    );

    // Primera carga del listado entero del mes
    this.cargarListado();
  }

  private readonly FETCH_ALL = 5000; // “suficientemente grande” para 1 mes

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ------ Cargas auxiliares ------
  private cargarSelects() {
    this.loader.show();
    this.catSrv
      .Listar(this.idUsuario)
      .pipe(finalize(() => this.loader.hide()))
      .subscribe({
        next: (r: any) => {
          const list = r?.dataList ?? r ?? [];
          this.categorias.set(
            list.map((x: any) => ({ id: x.idCategoria, nombre: x.nombreCategoria }))
          );
        },
        error: () => this.swal.error('Error', 'No se pudieron cargar las categorías.'),
      });

    this.loader.show();
    this.ctaSrv
      .Listar(this.idUsuario)
      .pipe(finalize(() => this.loader.hide()))
      .subscribe({
        next: (r: any) => {
          const list = r?.dataList ?? r ?? [];
          const mapped = list.map((x: any) => ({ id: x.idCuenta, nombre: x.nombreCuenta }));
          this.cuentas.set(mapped);
          if (!this.f.idCuenta.value && mapped.length) this.f.idCuenta.setValue(mapped[0].id);
        },
        error: () => this.swal.error('Error', 'No se pudieron cargar las cuentas.'),
      });
  }

  private cargarRecientes() {
    const periodo = this.periodoActual();
    this.loader.show();
    this.txSrv
      .Listar({
        IdUsuario: this.idUsuario,
        periodo,
        pagina: 1,
        tamPagina: 10,
        soloActivas: true,
      })
      .pipe(finalize(() => this.loader.hide()))
      .subscribe({
        next: (r: any) => {
          const list = (r?.dataList ?? r ?? []).map(this.mapTx) as TxItem[];
          this.recientes.set(list);
        },
        error: () => this.swal.error('Error', 'No se pudieron cargar las transacciones recientes.'),
      });
  }

  // Listado paginado
  cargarListado() {
    this.loader.show();
    this.txSrv
      .Listar({
        IdUsuario: this.idUsuario,
        periodo: this.periodo(),
        pagina: 1,
        tamPagina: this.FETCH_ALL, // <<— traigo todo el mes
        soloActivas: true,
        // buscar: undefined            // filtro en front, no en el SP
      })
      .pipe(finalize(() => this.loader.hide()))
      .subscribe({
        next: (r: any) => {
          const src = r?.dataList ?? r ?? [];
          const list = (Array.isArray(src) ? src : []).map(this.mapTx) as TxItem[];
          this.origen.set(list);
          this.pagina.set(1); // reset
        },
        error: () => this.swal.error('Error', 'No se pudo cargar el listado de transacciones.'),
      });
  }

  private mapTx = (x: any): TxItem => ({
    idTransaccion: x.idTransaccion,
    tipoTransaccion: x.tipoTransaccion as 0 | 1,
    monto: Number(x.monto ?? 0),
    fechaTransaccion: x.fechaTransaccion,
    categoria: x.categoria ?? x.nombreCategoria ?? x.categoriaNombre ?? '',
    cuenta: x.cuenta ?? x.nombreCuenta ?? x.cuentaNombre ?? '',
    nota: x.nota ?? x.descripcion ?? null,
  });

  // ---- UI ----
  setTipo(v: 0 | 1) {
    this.f.tipoTransaccion.setValue(v);
  }

  prevMes() {
    this.periodo.set(this.shiftMes(this.periodo(), -1));
    this.pagina.set(1);
    this.cargarListado();
  }
  nextMes() {
    this.periodo.set(this.shiftMes(this.periodo(), 1));
    this.pagina.set(1);
    this.cargarListado();
  }

  buscarAhora() {
    this.buscar.set((this.buscarCtrl.value || '').trim());
    this.pagina.set(1);
  }
  limpiarBuscar() {
    this.buscarCtrl.setValue('');
  } // dispara el valueChanges

  // Cambiar página (ngx-pagination server-side)
  pageChanged(p: number) {
    this.pagina.set(p);
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
      nota: v.nota?.trim() || null,
    };

    this.cargando.set(true);
    this.loader.show();
    this.txSrv
      .Guardar(model)
      .pipe(
        finalize(() => {
          this.cargando.set(false);
          this.loader.hide();
        })
      )
      .subscribe({
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
          this.swal.error(
            'Error al guardar',
            err?.error?.message || 'Ocurrió un error inesperado.'
          );
        },
      });
  }

  resetForm(tipo: 0 | 1 = this.f.tipoTransaccion.value) {
    this.form.reset({
      tipoTransaccion: tipo,
      monto: '',
      idCuenta: this.cuentas()[0]?.id ?? null,
      idCategoria: null,
      fechaTransaccion: this.hoyISO(),
      nota: '',
    });
  }

  private refrescarAlertasConToasts(idCategoria?: number) {
    const periodo = this.periodoActual();
    const prev = new Set(this.alertaSrv.alertas().map((a) => a.idAlerta));

    this.alertaSrv.revisar(this.idUsuario, periodo, idCategoria).subscribe((r: any) => {
      this.alertaSrv.mergeFromResponse(r);
      const lista = (r?.dataList ?? r ?? []) as any[];
      lista
        .filter((a) => a.estado === 'N' && !prev.has(a.idAlerta))
        .forEach((a) => {
          const msg =
            a.tipo === 'C'
              ? `Alerta: ${a.categoria || 'Categoría'} alcanzó ${a.umbral}%`
              : `Alerta: presupuesto global alcanzó ${a.umbral}%`;
          const level: ToastLevel = a.umbral >= 100 ? 'danger' : a.umbral >= 90 ? 'high' : 'warn';
          this.toast.show(msg, level, {
            actionText: 'Ver presupuestos',
            action: () => (location.href = '/presupuestos'),
          });
        });
    });
  }

  // ---- Helpers ----
  invalid(ctrl: string) {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
  hoyISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
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
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
