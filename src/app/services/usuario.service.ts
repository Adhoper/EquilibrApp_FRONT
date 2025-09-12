// src/app/services/usuario.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  RUTA = 'api/Usuario/';
  BASE_API = environment.BASE_API_URL;

  constructor(private http: HttpClient) {}

  private getQuerys(q: string)   { return this.http.get(`${this.BASE_API}${q}`); }
  private postQuerys(q: string,d:any){ return this.http.post(`${this.BASE_API}${q}`, d); }
  private putQuerys(q: string, d:any){ return this.http.put(`${this.BASE_API}${q}`, d); }

  /**
   * POST /api/Usuario/actualizar-usuario
   * body: { idUsuario, nombre?, contrasenaActual?, contrasenaNueva? }
   */
  ActualizarUsuario(model: {
    idUsuario: number;
    nombre?: string | null;
    contrasenaActual?: string | null;
    contrasenaNueva?: string | null;
  }) {
    return this.postQuerys(`${this.RUTA}actualizar-usuario`, model);
  }
}
