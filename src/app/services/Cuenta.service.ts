// src/app/services/cuenta.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CuentaService {
  RUTA = 'api/Cuenta/';
  BASE_API = environment.BASE_API_URL;

  constructor(private http: HttpClient) {}

  private getQuerys(q: string) { return this.http.get(`${this.BASE_API}${q}`); }
  private postQuerys(q: string, d: any) { return this.http.post(`${this.BASE_API}${q}`, d); }
  private putQuerys(q: string, d: any) { return this.http.put(`${this.BASE_API}${q}`, d); }

  // GET /api/Cuenta/listar-cuenta
  Listar(IdUsuario: number, soloActivas: boolean = true, buscar?: string) {
    const qs = `IdUsuario=${IdUsuario}&soloActivas=${soloActivas}${buscar ? `&buscar=${encodeURIComponent(buscar)}` : ''}`;
    return this.getQuerys(`${this.RUTA}listar-cuenta?${qs}`);
  }

  // POST /api/Cuenta/guardar-cuenta
  Guardar(model: {
    idCuenta?: number | null,
    idUsuario: number,
    nombreCuenta: string,
    codigoMoneda?: string | null,
    saldoInicial?: number | null
  }) {
    return this.postQuerys(`${this.RUTA}guardar-cuenta`, model);
  }

  // PUT /api/Cuenta/cambiar-estatus-cuenta
  CambiarEstatus(model: { idUsuario: number; idCuenta: number; estatus: 'A' | 'I' }) {
    return this.putQuerys(`${this.RUTA}cambiar-estatus-cuenta`, model);
  }

  // GET /api/Cuenta/saldos-por-periodo?IdUsuario=..&periodo=YYYY-MM&idCuenta=
  SaldosPorPeriodo(IdUsuario: number, periodo: string, idCuenta?: number) {
    const qs = `IdUsuario=${IdUsuario}&periodo=${encodeURIComponent(periodo)}${idCuenta ? `&idCuenta=${idCuenta}` : ''}`;
    return this.getQuerys(`${this.RUTA}saldos-por-periodo?${qs}`);
  }
}
