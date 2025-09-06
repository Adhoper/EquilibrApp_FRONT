// src/app/services/presupuesto.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PresupuestoService {
  RUTA = 'api/Presupuesto/';
  BASE_API = environment.BASE_API_URL;

  constructor(private http: HttpClient) {}

  private getQuerys(q: string) { return this.http.get(`${this.BASE_API}${q}`); }
  private postQuerys(q: string, d: any) { return this.http.post(`${this.BASE_API}${q}`, d); }
  private putQuerys(q: string, d: any) { return this.http.put(`${this.BASE_API}${q}`, d); }

  // GET /api/Presupuesto/listar-presupuesto
  Listar(IdUsuario: number, periodo: string, soloActivos: boolean = true) {
    const qs = `IdUsuario=${IdUsuario}&periodo=${encodeURIComponent(periodo)}&soloActivos=${soloActivos}`;
    return this.getQuerys(`${this.RUTA}listar-presupuesto?${qs}`);
  }

  // POST /api/Presupuesto/guardar-presupuesto
  Guardar(model: {
    idPresupuesto?: number | null,
    idUsuario: number,
    idCategoria: number,
    periodo: string,         // 'YYYY-MM'
    montoLimite: number
  }) {
    return this.postQuerys(`${this.RUTA}guardar-presupuesto`, model);
  }

  // PUT /api/Presupuesto/cambiar-estatus-presupuesto
  CambiarEstatus(model: { idUsuario: number; idPresupuesto: number; estatus: 'A' | 'I' }) {
    return this.putQuerys(`${this.RUTA}cambiar-estatus-presupuesto`, model);
  }

  // GET /api/Presupuesto/uso-por-categoria-presupuesto
  UsoPorCategoria(IdUsuario: number, periodo: string) {
    const qs = `IdUsuario=${IdUsuario}&periodo=${encodeURIComponent(periodo)}`;
    return this.getQuerys(`${this.RUTA}uso-por-categoria-presupuesto?${qs}`);
  }

  // ------- Global -------
  // POST /api/Presupuesto/guardar-presupuesto-global
  GuardarGlobal(model: { idUsuario: number; periodo: string; montoLimiteGlobal: number }) {
    return this.postQuerys(`${this.RUTA}guardar-presupuesto-global`, model);
  }

  // GET /api/Presupuesto/uso-presupuesto-global
  UsoGlobal(IdUsuario: number, periodo: string) {
    const qs = `IdUsuario=${IdUsuario}&periodo=${encodeURIComponent(periodo)}`;
    return this.getQuerys(`${this.RUTA}uso-presupuesto-global?${qs}`);
  }
}
