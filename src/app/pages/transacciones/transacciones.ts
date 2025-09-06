// src/app/pages/transacciones/transacciones.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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

import { finalize } from 'rxjs/operators';

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
export class Transacciones implements OnInit {
  private fb        = inject(FormBuilder);
  private auth      = inject(AuthService);
  private txSrv     = inject(TransaccionService);
  private ctaSrv    = inject(CuentaService);
  private catSrv    = inject(CategoriaService);
  private alertaSrv = inject(AlertaService);
  private toast     = inject(ToastService);
  private swal      = inject(SwalService);
  private loader    = inject(LoaderService);

  user = this.auth.getUsuario();
  idUsuario = this.user?.idUsuario ?? 0;

  categorias = signal<Opcion[]>([]);
  cuentas    = signal<Opcion[]>([]);
  recientes  = signal<TxItem[]>([]);
  cargando   = signal(false);

  form = this.fb.nonNullable.group({
    tipoTransaccion: 0 as 0 | 1,
    monto: ['', [Validators.required, Validators.min(0.01)]],
    idCuenta: null as number | null,
    idCategoria: null as number | null,
    fechaTransaccion: this.hoyISO(),
    nota: ''
  });

  get f() { return this.form.controls; }
  isIngreso = computed(() => this.f.tipoTransaccion.value === 1);
  titulo    = computed(() => (this.isIngreso() ? 'Nuevo ingreso' : 'Nuevo gasto'));

  ngOnInit(): void {
    this.cargarSelects();
    this.cargarRecientes();
    console.log(this.isIngreso);
  }

  private cargarSelects() {
    this.loader.show();
    this.catSrv.Listar(this.idUsuario).pipe(
      finalize(() => this.loader.hide())
    ).subscribe((r: any) => {
      const list = r?.dataList ?? r ?? [];
      this.categorias.set(list.map((x: any) => ({ id: x.idCategoria, nombre: x.nombreCategoria })));
    });

    this.loader.show();
    this.ctaSrv.Listar(this.idUsuario).pipe(
      finalize(() => this.loader.hide())
    ).subscribe((r: any) => {
      const list = r?.dataList ?? r ?? [];
      const mapped = list.map((x: any) => ({ id: x.idCuenta, nombre: x.nombreCuenta }));
      this.cuentas.set(mapped);
      if (!this.f.idCuenta.value && mapped.length) this.f.idCuenta.setValue(mapped[0].id);
    });
  }

  private cargarRecientes() {
    const periodo = this.periodoActual();
    this.loader.show();
    this.txSrv.Listar({
      IdUsuario: this.idUsuario, periodo, pagina: 1, tamPagina: 10, soloActivas: true
    }).pipe(
      finalize(() => this.loader.hide())
    ).subscribe((r: any) => {
      const list = r?.dataList ?? r ?? [];
      this.recientes.set(list as TxItem[]);
    });
  }

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
          this.refrescarAlertasConToasts(model.idCategoria); // revisa/genera alertas y dispara toasts para nuevas
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

  /** Tras guardar: genera/actualiza alertas del período y muestra toasts SOLO para las nuevas */
// src/app/pages/transacciones/transacciones.ts
private refrescarAlertasConToasts(idCategoria?: number) {
  const periodo = this.periodoActual();
  const prev = new Set(this.alertaSrv.alertas().map(a => a.idAlerta));

  this.alertaSrv.revisar(this.idUsuario, periodo, idCategoria).subscribe((r: any) => {
    // ⬇️ fusiona con las que ya tienes en memoria (sin D)
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



  invalid(ctrl: string) {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
  hoyISO() { const d = new Date(); return d.toISOString().slice(0, 10); }
  periodoActual() { const d = new Date(); const m = String(d.getMonth()+1).padStart(2,'0'); return `${d.getFullYear()}-${m}`; }
}
