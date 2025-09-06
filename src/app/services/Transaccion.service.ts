// src/app/services/transaccion.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TransaccionService {
  RUTA = 'api/Transaccion/';
  BASE_API = environment.BASE_API_URL;

  constructor(private http: HttpClient) {}

  private getQuerys(q: string) { return this.http.get(`${this.BASE_API}${q}`); }
  private postQuerys(q: string, d: any) { return this.http.post(`${this.BASE_API}${q}`, d); }
  private putQuerys(q: string, d: any) { return this.http.put(`${this.BASE_API}${q}`, d); }

  // POST /api/Transaccion/guardar-transaccion
  Guardar(model: {
    idTransaccion?: number | null,
    idUsuario: number,
    idCuenta: number,
    idCategoria: number,
    tipoTransaccion: 0 | 1,
    monto: number,
    fechaTransaccion: string, // ISO
    nota?: string | null
  }) {
    return this.postQuerys(`${this.RUTA}guardar-transaccion`, model);
  }

  // PUT /api/Transaccion/cambiar-estatus-transaccion
  CambiarEstatus(model: { idUsuario: number; idTransaccion: number; estatus: 'A' | 'I' }) {
    return this.putQuerys(`${this.RUTA}cambiar-estatus-transaccion`, model);
  }

  // GET /api/Transaccion/listar-transaccion
  Listar(params: {
    IdUsuario: number;
    periodo: string;                   // 'YYYY-MM'
    idCategoria?: number;
    idCuenta?: number;
    tipo?: 0 | 1;
    buscar?: string;
    pagina?: number;
    tamPagina?: number;
    soloActivas?: boolean;
  }) {
    const {
      IdUsuario, periodo, idCategoria, idCuenta, tipo, buscar,
      pagina = 1, tamPagina = 50, soloActivas = true
    } = params;

    const qs = [
      `IdUsuario=${IdUsuario}`,
      `periodo=${encodeURIComponent(periodo)}`,
      idCategoria != null ? `idCategoria=${idCategoria}` : '',
      idCuenta != null ? `idCuenta=${idCuenta}` : '',
      tipo != null ? `tipo=${tipo}` : '',
      buscar ? `buscar=${encodeURIComponent(buscar)}` : '',
      `pagina=${pagina}`,
      `tamPagina=${tamPagina}`,
      `soloActivas=${soloActivas}`
    ].filter(Boolean).join('&');

    return this.getQuerys(`${this.RUTA}listar-transaccion?${qs}`);
  }

  // GET /api/Transaccion/transacciones-por-periodo
  TotalesPeriodo(IdUsuario: number, periodo: string) {
    const qs = `IdUsuario=${IdUsuario}&periodo=${encodeURIComponent(periodo)}`;
    return this.getQuerys(`${this.RUTA}transacciones-por-periodo?${qs}`);
  }

  // GET /api/Transaccion/resumen-categoria
  ResumenPorCategoria(IdUsuario: number, periodo: string) {
    const qs = `IdUsuario=${IdUsuario}&periodo=${encodeURIComponent(periodo)}`;
    return this.getQuerys(`${this.RUTA}resumen-categoria?${qs}`);
  }
}
