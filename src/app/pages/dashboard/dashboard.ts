import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../services/AuthService.service';
import { CuentaService } from '../../services/Cuenta.service';
import { LoaderService } from '../../services/loader.service';
import { PresupuestoService } from '../../services/Presupuesto.service';
import { TransaccionService } from '../../services/Transaccion.service';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  // services
private auth = inject(AuthService);
  private txSrv = inject(TransaccionService);
  private preSrv = inject(PresupuestoService);
  private ctaSrv = inject(CuentaService);
  private loader = inject(LoaderService);

  uid = this.auth.userId();
  today = new Date();
  current = signal(new Date(this.today.getFullYear(), this.today.getMonth(), 1));
  periodo = computed(() => {
    const d = this.current();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  });

  totales = signal<any>({ totalIngresos: 0, totalGastos: 0, balance: 0 });
  resumenCat = signal<any[]>([]);
  presuCat = signal<any[]>([]);
  presuGlobal = signal<any | null>(null);
  cuentas = signal<any[]>([]);
  recientes = signal<any[]>([]);

  palette = ['#10b981','#6366f1','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#84cc16','#f97316','#14b8a6','#e11d48'];

  ngOnInit() { this.loadAll(); }

  changeMonth(delta: number) {
    const d = this.current();
    this.current.set(new Date(d.getFullYear(), d.getMonth() + delta, 1));
    this.loadAll();
  }

  private loadAll() {
    const uid = this.uid;
    const periodo = this.periodo();

    this.loader.show();

    this.txSrv.TotalesPeriodo(uid, periodo).subscribe({
      next: (r:any) => {
        const s = r?.singleData || {};
        this.totales.set({
          totalIngresos: Number(s.totalIngresos ?? 0),
          totalGastos: Number(s.totalGastos ?? 0),
          balance: Number(s.balance ?? (Number(s.totalIngresos||0) - Number(s.totalGastos||0)))
        });
      },
      error: () => {}
    });

    this.txSrv.ResumenPorCategoria(uid, periodo).subscribe({
      next: (r:any) => {
        const arr = (r?.dataList || r?.singleData || []) as any[];
        this.resumenCat.set((arr ?? []).map((x,i) => ({
          idCategoria: x.idCategoria ?? i,
          categoria: x.nombreCategoria ?? x.categoria ?? 'Sin categoría',
          totalGasto: Number(x.totalGasto ?? x.monto ?? 0),
          porcentaje: Number(x.porcentaje ?? 0),
          colorHexadecimal: x.colorHexadecimal
        })));
      },
      error: () => {}
    });

    this.preSrv.UsoPorCategoria(uid, periodo).subscribe({
      next: (r:any) => {
        const arr = (r?.dataList || r?.singleData || []) as any[];
        this.presuCat.set((arr ?? []).map(x => ({
          idPresupuesto: x.idPresupuesto ?? 0,
          categoria: x.categoria ?? x.nombreCategoria ?? 'Sin categoría',
          montoLimite: Number(x.montoLimite ?? x.limite ?? 0),
          gastado: Number(x.gastado ?? x.consumido ?? 0),
          porcentaje: Number(x.porcentaje ?? (Number(x.gastado||0)*100 / Math.max(1, Number(x.montoLimite||0)))),
          estatus: x.estatus ?? 'A'
        })));
      },
      error: () => {}
    });

    this.preSrv.UsoGlobal(uid, periodo).subscribe({
      next: (r:any) => {
        const s = r?.singleData || {};
        this.presuGlobal.set({
          montoLimiteGlobal: Number(s.montoLimiteGlobal ?? s.limite ?? 0),
          gastado: Number(s.gastado ?? s.consumido ?? 0),
          porcentaje: Number(s.porcentaje ?? (Number(s.gastado||0)*100 / Math.max(1, Number(s.montoLimiteGlobal||0)))),
        });
      },
      error: () => {}
    });

    this.ctaSrv.SaldosPorPeriodo(uid, periodo).subscribe({
      next: (r:any) => {
        const arr = (r?.dataList || r?.singleData || []) as any[];
        this.cuentas.set((arr ?? []).map(x => ({
          idCuenta: x.idCuenta ?? 0,
          nombreCuenta: x.nombreCuenta ?? x.cuenta ?? 'Cuenta',
          saldoFinal: Number(x.saldoFinal ?? x.saldo ?? 0),
        })));
      },
      error: () => {}
    });

    this.txSrv.Listar({ IdUsuario: uid, periodo, pagina: 1, tamPagina: 8, soloActivas: true }).subscribe({
      next: (r:any) => {
        const arr = (r?.dataList || r?.singleData || []) as any[];
        this.recientes.set((arr ?? []).map(x => ({
          idTransaccion: x.idTransaccion ?? 0,
          fechaTransaccion: x.fechaTransaccion ?? x.fecha ?? new Date().toISOString(),
          categoria: x.categoria ?? x.nombreCategoria ?? '—',
          cuenta: x.cuenta ?? x.nombreCuenta ?? '—',
          tipoTransaccion: x.tipoTransaccion ?? x.tipo ?? 1,
          monto: Number(x.monto ?? 0),
          nota: x.nota ?? ''
        })));
      },
      error: () => {},
      complete: () => this.loader.hide()
    });
  }

  donutStyle() {
    const data = this.resumenCat();
    if (!data.length) return {'--donut': 'conic-gradient(#e5e7eb 0 360deg)'} as any;

    let acc = 0;
    const stops: string[] = [];
    const totalPorc = data.reduce((s, x) => s + (x.porcentaje || 0), 0) || 1;

    data.forEach((x, i) => {
      const p = (x.porcentaje || 0) / totalPorc;
      const start = acc * 360;
      const end = (acc + p) * 360;
      const color = x.colorHexadecimal || this.palette[i % this.palette.length];
      stops.push(`${color} ${start}deg ${end}deg`);
      acc += p;
    });

    return {'--donut': `conic-gradient(${stops.join(',')})`} as any;
  }

  // helpers UI
  clampPct(v?: number | null) {
    const n = Number(v ?? 0);
    return Math.min(100, Math.max(0, n));
  }
  chipClass(pct:number) {
    if (pct >= 100) return 'bg-red-100 text-red-700 border-red-200';
    if (pct >= 90)  return 'bg-orange-100 text-orange-700 border-orange-200';
    if (pct >= 75)  return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
  // ► Mes en español
  fmtMonth(d: Date) {
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }
}
