// src/app/services/categoria.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  RUTA = 'api/Categoria/';
  BASE_API = environment.BASE_API_URL;

  constructor(private http: HttpClient) {}

  private getQuerys(q: string) { return this.http.get(`${this.BASE_API}${q}`); }
  private postQuerys(q: string, d: any) { return this.http.post(`${this.BASE_API}${q}`, d); }
  private putQuerys(q: string, d: any) { return this.http.put(`${this.BASE_API}${q}`, d); }

  // GET /api/Categoria/listar-categoria?IdUsuario=..&soloActivas=true&buscar=
  Listar(IdUsuario: number, soloActivas: boolean = true, buscar?: string) {
    const qs = `IdUsuario=${IdUsuario}&soloActivas=${soloActivas}${buscar ? `&buscar=${encodeURIComponent(buscar)}` : ''}`;
    return this.getQuerys(`${this.RUTA}listar-categoria?${qs}`);
  }

  // POST /api/Categoria/guardar-categoria
  Guardar(model: {
    idCategoria?: number | null,
    idUsuario: number,
    nombreCategoria: string,
    tipoCategoria: 0 | 1,
    colorHexadecimal?: string | null
  }) {
    return this.postQuerys(`${this.RUTA}guardar-categoria`, model);
  }

  // PUT /api/Categoria/cambiar-estatus-categoria
  CambiarEstatus(model: { idUsuario: number; idCategoria: number; estatus: 'A' | 'I' }) {
    return this.putQuerys(`${this.RUTA}cambiar-estatus-categoria`, model);
  }
}
