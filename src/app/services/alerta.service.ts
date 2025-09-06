// src/app/services/alerta.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export type Alerta = {
  idAlerta: number;
  tipo: 'C' | 'G';
  idCategoria?: number | null;
  categoria?: string | null;
  umbral: number;
  porcentaje: number;
  fechaCreacion?: string;
  estado: 'N' | 'L' | 'D';
};

@Injectable({ providedIn: 'root' })
export class AlertaService {
  private http = inject(HttpClient);
  private BASE = environment.BASE_API_URL + 'api/Alerta/';

  alertas = signal<Alerta[]>([]);

  // === Persistencia local por usuario/periodo ===
  private ctx: { idUsuario: number; periodo: string } | null = null;
  setContext(idUsuario: number, periodo: string) {
    this.ctx = { idUsuario, periodo };
  }
  private storageKey() {
    const c = this.ctx;
    return c ? `ea_alertas_${c.idUsuario}_${c.periodo}` : 'ea_alertas';
  }
  private saveToStorage(list: Alerta[]) {
    try { localStorage.setItem(this.storageKey(), JSON.stringify(list)); } catch {}
  }
  private loadFromStorage(): Alerta[] {
    try {
      const raw = localStorage.getItem(this.storageKey());
      const list: Alerta[] = raw ? JSON.parse(raw) : [];
      return list.filter(a => a.estado !== 'D'); // nunca descartadas
    } catch { return []; }
  }
  /** Hidrata el signal desde localStorage (sin consultarle aún al backend) */
  hydrate(idUsuario: number, periodo: string) {
    this.setContext(idUsuario, periodo);
    const list = this.loadFromStorage()
      .sort((a,b) => (b.fechaCreacion ?? '').localeCompare(a.fechaCreacion ?? ''));
    this.alertas.set(list);
  }
  /** Persiste el estado actual a localStorage */
  persistCurrent() { this.saveToStorage(this.alertas()); }

  // === Normalización de respuestas ===
  private normalize(r: any): Alerta[] {
    const raw = Array.isArray(r) ? r : (r?.dataList ?? r ?? []);
    const list: Alerta[] = Array.isArray(raw) ? raw : [];
    return list.filter(a => a.estado !== 'D'); // nunca D
  }

  /** Reemplaza por completo el estado (y persiste) */
  setFromResponse(r: any) {
    const list = this.normalize(r)
      .sort((a,b) => (b.fechaCreacion ?? '').localeCompare(a.fechaCreacion ?? ''));
    this.alertas.set(list);
    this.persistCurrent();
  }

  /** Fusiona sin duplicar (y persiste) */
  mergeFromResponse(r: any) {
    const incoming = this.normalize(r);
    const map = new Map<number, Alerta>(this.alertas().map(a => [a.idAlerta, a]));
    incoming.forEach(a => map.set(a.idAlerta, a));
    const merged = Array.from(map.values())
      .filter(a => a.estado !== 'D')
      .sort((a,b) => (b.fechaCreacion ?? '').localeCompare(a.fechaCreacion ?? ''));
    this.alertas.set(merged);
    this.persistCurrent();
  }

  // === Endpoints ===
  cargar(idUsuario: number, periodo: string, estado?: 'N'|'L'|'D') {
    const url = `${this.BASE}listar-alertas?idUsuario=${idUsuario}&periodo=${periodo}${estado ? `&estado=${estado}` : ''}`;
    return this.http.get(url);
  }

  revisar(idUsuario: number, periodo: string, idCategoria?: number) {
    const qs = new URLSearchParams({ idUsuario: String(idUsuario), periodo });
    if (idCategoria != null) qs.set('idCategoria', String(idCategoria));
    return this.http.get(`${this.BASE}revisar?${qs.toString()}`);
  }

  marcarLeida(idAlerta: number, idUsuario: number) {
    return this.http.put(`${this.BASE}marcar-leida/${idAlerta}?idUsuario=${idUsuario}`, {});
  }
  marcarTodas(idUsuario: number, periodo: string) {
    return this.http.put(`${this.BASE}marcar-todas?idUsuario=${idUsuario}&periodo=${periodo}`, {});
  }
  descartar(idAlerta: number, idUsuario: number) {
    return this.http.put(`${this.BASE}descartar/${idAlerta}?idUsuario=${idUsuario}`, {});
  }

  refrescar(idUsuario: number, periodo: string, estado?: 'N'|'L'|'D') {
    return this.cargar(idUsuario, periodo, estado);
  }
}
