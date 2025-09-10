import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { TooltipComponent, GridComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';

echarts.use([BarChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer]);

import { AuthService } from '../../services/AuthService.service';
import { LoaderService } from '../../services/loader.service';
import { SwalService } from '../../services/swal.service';
import { CuentaService } from '../../services/Cuenta.service';

type Opcion = { id: number; nombre: string };

// Tipado defensivo: incluye posibles alias que pueda traer el API
type RowApi = {
  idCuenta: number;
  nombreCuenta?: string;
  cuenta?: string;

  saldoInicial?: number;
  SaldoInicial?: number;

  totalIngresos?: number;
  ingresos?: number;     // alias posible

  totalGastos?: number;
  gastos?: number;       // alias posible

  saldoFinal?: number;
  SaldoFinal?: number;
};

type Fila = {
  idCuenta: number;
  cuenta: string;
  saldoInicial: number;
  ingresos: number;
  gastos: number;
  saldoFinal: number;
};

@Component({
  selector: 'app-saldos-periodo',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  templateUrl: './saldos-periodo.html',
  providers: [provideEchartsCore({ echarts })],
})
export class SaldosPeriodo implements OnInit {
  // services
  private auth = inject(AuthService);
  private loader = inject(LoaderService);
  private swal = inject(SwalService);
  private ctaSrv = inject(CuentaService);

  // user
  user = this.auth.getUsuario();
  idUsuario = this.user?.idUsuario ?? 0;

  // state
  periodo = signal(this.periodoActual());
  cuentas = signal<Opcion[]>([]);
  idCuenta = signal<number | null>(null); // null = todas
  filas = signal<Fila[]>([]);

  // totales
  totales = computed(() => {
    const arr = this.filas();
    const saldoInicial = arr.reduce((a, b) => a + b.saldoInicial, 0);
    const ingresos = arr.reduce((a, b) => a + b.ingresos, 0);
    const gastos = arr.reduce((a, b) => a + b.gastos, 0);
    const saldoFinal = arr.reduce((a, b) => a + b.saldoFinal, 0);
    const variacion = ingresos - gastos;
    return { saldoInicial, ingresos, gastos, saldoFinal, variacion };
  });

  // ===== Charts =====
  igOptions = computed<EChartsCoreOption>(() => {
    const xs = this.filas().map((f) => f.cuenta);
    const ingresos = this.filas().map((f) => f.ingresos);
    const gastos = this.filas().map((f) => f.gastos);

    return {
      grid: { left: 8, right: 12, top: 24, bottom: 48, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: any) => this.fmtMoneda(Number(v)),
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#cbd5e1' },
      },
      xAxis: {
        type: 'category',
        data: xs,
        axisLabel: { color: '#94a3b8', interval: 0, rotate: xs.length > 6 ? 25 : 0 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.2)' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,.08)' } },
      },
      series: [
        { name: 'Ingresos', type: 'bar', data: ingresos, itemStyle: { color: '#10b981' }, barMaxWidth: 36 },
        { name: 'Gastos',   type: 'bar', data: gastos,   itemStyle: { color: '#ef4444' }, barMaxWidth: 36 },
      ],
    };
  });

  saldoOptions = computed<EChartsCoreOption>(() => {
    const xs = this.filas().map((f) => f.cuenta);
    const sf = this.filas().map((f) => f.saldoFinal);
    return {
      grid: { left: 8, right: 12, top: 24, bottom: 48, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: any) => this.fmtMoneda(Number(v)),
      },
      xAxis: {
        type: 'category',
        data: xs,
        axisLabel: { color: '#94a3b8', interval: 0, rotate: xs.length > 6 ? 25 : 0 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.2)' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,.08)' } },
      },
      series: [
        { type: 'bar', data: sf, itemStyle: { color: '#06b6d4' }, barMaxWidth: 36, label: { show: true, position: 'top', color: '#cbd5e1', formatter: (p: any) => this.formatoCorto(Number(p.value)) } },
      ],
    };
  });

  ngOnInit(): void {
    this.cargarCuentas();
    this.cargar();
  }

  // ===== Data =====
  private cargarCuentas() {
    this.ctaSrv.Listar(this.idUsuario, true).subscribe({
      next: (r: any) => {
        const list = (r?.dataList ?? r ?? []) as any[];
        this.cuentas.set(list.map(x => ({ id: x.idCuenta, nombre: x.nombreCuenta })));
      },
      error: () => {},
    });
  }

  // Arrow function para evitar perder `this` y con acceso tipado
  private mapRow = (x: RowApi): Fila => {
    const saldoInicial = Number(x.saldoInicial ?? x.SaldoInicial ?? 0);
    const ingresos = Number(x.totalIngresos ?? x.ingresos ?? 0);
    const gastos = Number(x.totalGastos ?? x.gastos ?? 0);
    const saldoFinal = Number(x.saldoFinal ?? x.SaldoFinal ?? (saldoInicial + ingresos - gastos));

    return {
      idCuenta: Number(x.idCuenta),
      cuenta: x.nombreCuenta ?? x.cuenta ?? `Cuenta ${x.idCuenta}`,
      saldoInicial,
      ingresos,
      gastos,
      saldoFinal,
    };
  };

  cargar() {
    this.loader.show();
    this.ctaSrv
      .SaldosPorPeriodo(this.idUsuario, this.periodo(), this.idCuenta() ?? undefined)
      .subscribe({
        next: (r: any) => {
          this.loader.hide();
          const raw = (r?.dataList ?? r ?? []) as RowApi[] | any;
          const arr: RowApi[] = Array.isArray(raw) ? (raw as RowApi[]) : (raw?.rows as RowApi[] ?? []);
          const list: Fila[] = (arr || [])
            .map((row) => this.mapRow(row))
            .sort((a: Fila, b: Fila) => a.cuenta.localeCompare(b.cuenta));
          this.filas.set(list);
        },
        error: () => {
          this.loader.hide();
          this.swal.error('Error', 'No se pudo cargar el saldo por período.');
          this.filas.set([]);
        },
      });
  }

  // ===== UI =====
  onCuentaChange(v: number | null) {
    this.idCuenta.set(v);
    this.cargar();
  }

  prevMes() { this.periodo.set(this.shiftMes(this.periodo(), -1)); this.cargar(); }
  nextMes() { this.periodo.set(this.shiftMes(this.periodo(),  1)); this.cargar(); }

  // ===== Helpers =====
  fmtPeriodo(p: string) {
    const [y, m] = p.split('-').map(Number);
    const d = new Date(y, (m ?? 1) - 1, 1);
    return d.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
  }
  periodoActual() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${m}`;
  }
  private shiftMes(p: string, delta: number) {
    const [y, m] = p.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  fmtMoneda(v: number) {
    try {
      return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP',
        maximumFractionDigits: 0,
      }).format(v || 0);
    } catch {
      return `DOP${Math.round(v || 0)}`;
    }
  }
  formatoCorto(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return `${Math.round(n)}`;
  }
}
