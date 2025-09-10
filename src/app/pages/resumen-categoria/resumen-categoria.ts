import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

import * as echarts from 'echarts/core';
import { PieChart, BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';

echarts.use([
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer,
]);

import { AuthService } from '../../services/AuthService.service';
import { LoaderService } from '../../services/loader.service';
import { SwalService } from '../../services/swal.service';
import { TransaccionService } from '../../services/Transaccion.service';
import { CategoriaService } from '../../services/Categoria.service';

type Row = { idCategoria: number; nombreCategoria: string; totalGasto: number };
// 👇 color ahora es obligatorio (string), no opcional
type Item = { id: number; nombre: string; total: number; color: string };

@Component({
  selector: 'app-resumen-categoria',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  templateUrl: './resumen-categoria.html',
  providers: [provideEchartsCore({ echarts })],
})
export class ResumenCategoria implements OnInit {
  // services
  private auth = inject(AuthService);
  private loader = inject(LoaderService);
  private swal = inject(SwalService);
  private txSrv = inject(TransaccionService);
  private catSrv = inject(CategoriaService);

  // user
  user = this.auth.getUsuario();
  idUsuario = this.user?.idUsuario ?? 0;

  // state
  periodo = signal(this.periodoActual());
  filas = signal<Item[]>([]);
  colores = signal<Record<number, string>>({}); // idCategoria -> color
  totalMes = computed(() =>
    this.filas().reduce((a, b) => a + (b.total || 0), 0)
  );

  // ===== Charts =====
  // Pie
  pieOptions = computed<EChartsCoreOption>(() => {
    const data = this.filas().map((f) => ({ name: f.nombre, value: f.total }));
    const colors: string[] = this.filas().map((f) => f.color); // <- siempre string
    return {
      tooltip: {
        trigger: 'item',
        valueFormatter: (v: any) => this.fmtMoneda(Number(v)),
      },
      legend: { bottom: 0, textStyle: { color: '#cbd5e1' } },
      color: colors,
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: true,
          label: {
            show: true,
            formatter: (p: any) => `${p.name}\n${this.pctStr(p.percent)}`,
          },
          labelLine: { length: 10, length2: 8 },
          data,
        },
      ],
    };
  });

  // Barras
  barOptions = computed<EChartsCoreOption>(() => {
    const xs = this.filas().map((f) => f.nombre);
    const ys = this.filas().map((f) => f.total);
    const colors: string[] = this.filas().map((f) => f.color);
    return {
      grid: { left: 6, right: 10, top: 18, bottom: 40, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: any) => this.fmtMoneda(Number(v)),
      },
      xAxis: {
        type: 'category',
        data: xs,
        axisLabel: {
          color: '#94a3b8',
          interval: 0,
          rotate: xs.length > 6 ? 25 : 0,
        },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.2)' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,.08)' } },
      },
      series: [
        {
          type: 'bar',
          data: ys.map((v, i) => ({
            value: v,
            itemStyle: { color: colors[i] },
          })),
          label: {
            show: true,
            position: 'top',
            color: '#cbd5e1',
            formatter: (p: any) => (p.value ? this.formatoCorto(p.value) : ''),
          },
          barMaxWidth: 36,
        },
      ],
    };
  });

  ngOnInit(): void {
    this.cargarColores();
    this.cargar();
  }

  // ===== Data =====
  private cargarColores() {
    // opcional; si falla, seguimos con paleta por defecto
    this.catSrv.Listar(this.idUsuario, true).subscribe({
      next: (r: any) => {
        const list = (r?.dataList ?? r ?? []) as any[];
        const m: Record<number, string> = {};
        list.forEach(
          (x) => (m[x.idCategoria] = (x.colorHexadecimal || '#22C55E').toUpperCase())
        );
        this.colores.set(m);
      },
      error: () => {},
    });
  }

  cargar() {
    this.loader.show();
    this.txSrv.ResumenPorCategoria(this.idUsuario, this.periodo()).subscribe({
      next: (r: any) => {
        this.loader.hide();
        const raw = (r?.dataList ?? r ?? []) as Row[];
        const items: Item[] = (raw || [])
          .map((x) => ({
            id: Number(x.idCategoria),
            nombre: x.nombreCategoria,
            total: Number(x.totalGasto || 0),
            color: this.colorDe(Number(x.idCategoria)), // <- garantiza string
          }))
          .filter((x) => x.total > 0)
          .sort((a, b) => b.total - a.total);
        this.filas.set(items);
      },
      error: () => {
        this.loader.hide();
        this.swal.error('Error', 'No se pudo cargar el resumen por categoría.');
        this.filas.set([]);
      },
    });
  }

  // ===== UI =====
  prevMes() {
    this.periodo.set(this.shiftMes(this.periodo(), -1));
    this.cargar();
  }
  nextMes() {
    this.periodo.set(this.shiftMes(this.periodo(), 1));
    this.cargar();
  }

  // ===== Helpers =====
  private colorDe(id: number): string {
    const c = this.colores()[id];
    if (c) return c;

    // paleta fallback
    const palette = [
      '#22C55E',
      '#0EA5E9',
      '#6366F1',
      '#F59E0B',
      '#EF4444',
      '#14B8A6',
      '#84CC16',
      '#F472B6',
      '#A855F7',
      '#06B6D4',
    ];
    // usa el id como "semilla" para un color estable
    return palette[Math.abs(id) % palette.length];
  }

  pctStr(v: number) {
    const n = Math.max(0, Math.min(100, Number(v || 0)));
    return `${n.toFixed(0)}%`;
  }

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
