import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/AuthService.service';
import { CuentaService } from '../../services/Cuenta.service';
import { LoaderService } from '../../services/loader.service';
import { PresupuestoService } from '../../services/Presupuesto.service';
import { TransaccionService } from '../../services/Transaccion.service';

// === ECharts ===
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { PieChart, BarChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent, GridComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';
echarts.use([PieChart, BarChart, TooltipComponent, LegendComponent, GridComponent, TitleComponent, CanvasRenderer]);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
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
  private router = inject(Router);

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

  verTodas() {
  this.router.navigate(['/transacciones'], { fragment: 'all-transacciones' });
}

  private loadAll() {
    const uid = this.uid;
    const periodo = this.periodo();

    this.loader.show();

    this.txSrv.TotalesPeriodo(uid, periodo).subscribe({
      next: (r: any) => {
        const s = r?.singleData || {};
        this.totales.set({
          totalIngresos: Number(s.totalIngresos ?? 0),
          totalGastos: Number(s.totalGastos ?? 0),
          balance: Number(s.balance ?? Number(s.totalIngresos || 0) - Number(s.totalGastos || 0)),
        });
      },
      error: () => {},
    });

    this.txSrv.ResumenPorCategoria(uid, periodo).subscribe({
      next: (r: any) => {
        const arr = (r?.dataList || r?.singleData || []) as any[];
        this.resumenCat.set(
          (arr ?? []).map((x, i) => ({
            idCategoria: x.idCategoria ?? i,
            categoria: x.nombreCategoria ?? x.categoria ?? 'Sin categoría',
            totalGasto: Number(x.totalGasto ?? x.monto ?? 0),
            porcentaje: Number(x.porcentaje ?? 0),
            colorHexadecimal: (x.colorHexadecimal || '').toUpperCase() || null,
          }))
        );
      },
      error: () => {},
    });

    this.preSrv.UsoPorCategoria(uid, periodo).subscribe({
      next: (r: any) => {
        const arr = (r?.dataList || r?.singleData || []) as any[];
        this.presuCat.set(
          (arr ?? []).map((x) => {
            const limite = Number(x.montoLimite ?? x.limite ?? 0);
            const gastado = Number(x.gastado ?? x.consumido ?? 0);
            const pct = Number(x.porcentaje ?? (gastado * 100) / Math.max(1, limite));
            return {
              idPresupuesto: x.idPresupuesto ?? 0,
              categoria: x.categoria ?? x.nombreCategoria ?? 'Sin categoría',
              montoLimite: limite,
              gastado,
              porcentaje: pct,
              estatus: x.estatus ?? 'A',
            };
          })
        );
      },
      error: () => {},
    });

    this.preSrv.UsoGlobal(uid, periodo).subscribe({
      next: (r: any) => {
        const s = r?.singleData || {};
        const limite = Number(s.montoLimiteGlobal ?? s.limite ?? 0);
        const gastado = Number(s.gastadoTotal ?? s.gastado ?? s.consumido ?? 0);
        const pctRaw = Number(s.porcentajeUsoGlobal ?? s.porcentaje ?? (gastado * 100) / Math.max(1, limite));
        const porcentaje = Math.round(pctRaw * 100) / 100;
        this.presuGlobal.set({ montoLimiteGlobal: limite, gastado, porcentaje });
      },
      error: () => {},
    });

    this.ctaSrv.SaldosPorPeriodo(uid, periodo).subscribe({
      next: (r: any) => {
        const arr = (r?.dataList || r?.singleData || []) as any[];
        this.cuentas.set(
          (arr ?? []).map((x) => ({
            idCuenta: x.idCuenta ?? 0,
            nombreCuenta: x.nombreCuenta ?? x.cuenta ?? 'Cuenta',
            saldoFinal: Number(x.saldoFinal ?? x.saldo ?? 0),
          }))
        );
      },
      error: () => {},
    });

    this.txSrv.Listar({ IdUsuario: uid, periodo, pagina: 1, tamPagina: 8, soloActivas: true })
      .subscribe({
        next: (r: any) => {
          const arr = (r?.dataList || r?.singleData || []) as any[];
          this.recientes.set(
            (arr ?? []).map((x) => ({
              idTransaccion: x.idTransaccion ?? 0,
              fechaTransaccion: x.fechaTransaccion ?? x.fecha ?? new Date().toISOString(),
              categoria: x.categoria ?? x.nombreCategoria ?? '—',
              cuenta: x.cuenta ?? x.nombreCuenta ?? '—',
              tipoTransaccion: x.tipoTransaccion ?? x.tipo ?? 1,
              monto: Number(x.monto ?? 0),
              nota: x.nota ?? '',
            }))
          );
        },
        error: () => {},
        complete: () => this.loader.hide(),
      });
  }

  // === ECharts options ===
  pieOptions = computed<EChartsCoreOption>(() => {
    const data = this.resumenCat();
    const total = data.reduce((s, x) => s + (x.totalGasto || 0), 0);
    const items = data.map((x, i) => ({
      name: x.categoria,
      value: x.totalGasto,
      itemStyle: { color: x.colorHexadecimal || this.palette[i % this.palette.length] }
    }));

    return {
      tooltip: {
        trigger: 'item',
        valueFormatter: (v: any) => this.fmtMoneda(Number(v))
      },
      legend: { show: false },
      title: {
        text: total ? this.fmtMoneda(total) : 'Sin datos',
        subtext: 'Gasto total',
        left: 'center',
        top: '45%',
        textStyle: { color: '#e2e8f0', fontSize: 14, fontWeight: 600 },
        subtextStyle: { color: '#94a3b8', fontSize: 11 }
      },
      series: [{
        type: 'pie',
        radius: ['55%','75%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: items
      }]
    };
  });

  budgetBarOptions = computed<EChartsCoreOption>(() => {
    const arr = this.presuCat();
    const ys = arr.map(x => x.categoria);
    const vs = arr.map(x => Math.min(100, Math.max(0, Number(x.porcentaje || 0))));
    const colors = vs.map(p => this.colorForPct(p));

    return {
      grid: { left: 120, right: 16, top: 10, bottom: 24 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p: any) => {
          const i = p[0]?.dataIndex ?? 0;
          const item = arr[i];
          const gastado = this.fmtMoneda(item?.gastado || 0);
          const limite = this.fmtMoneda(item?.montoLimite || 0);
          return `<div style="font-size:12px"><b>${item?.categoria || ''}</b><br/>${gastado} / ${limite} • ${vs[i]}%</div>`;
        }
      },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: { color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,.08)' } }
      },
      yAxis: {
        type: 'category',
        data: ys,
        axisLabel: { color: '#cbd5e1' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.2)' } }
      },
      series: [{
        type: 'bar',
        barMaxWidth: 18,
        data: vs.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })),
        label: { show: true, position: 'right', color: '#cbd5e1', formatter: '{c}%' }
      }]
    };
  });

  // helpers UI
  clampPct(v?: number | null) {
    const n = Number(v ?? 0);
    return Math.min(100, Math.max(0, n));
  }
  chipClass(pct: number) {
    if (pct >= 100) return 'bg-red-100 text-red-700 border-red-200';
    if (pct >= 90) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (pct >= 75) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
  colorForPct(p: number) {
    if (p >= 100) return '#ef4444';
    if (p >= 90)  return '#f97316';
    if (p >= 75)  return '#f59e0b';
    return '#10b981';
  }
  fmtMonth(d: Date) {
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }
  fmtMoneda(v: number) {
    try { return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 }).format(v || 0); }
    catch { return `DOP${Math.round(v || 0)}`; }
  }
}
