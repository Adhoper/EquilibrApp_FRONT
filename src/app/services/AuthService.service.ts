import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { jwtDecode } from "jwt-decode";


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  BASE_API = environment.BASE_API_URL;
  RUTA_AUTH = "api/Autenticacion/";
  RUTA_USER = 'api/Usuario/';

  constructor(private http: HttpClient, private router: Router) {}

  getQuerys(query: string)   { return this.http.get(`${this.BASE_API}${query}`); }
  postQuerys(query: string, data: any) { return this.http.post(`${this.BASE_API}${query}`, data); }
  putQuerys(query: string, data: any)  { return this.http.put(`${this.BASE_API}${query}`, data); }

// ---------- endpoints de autenticación ----------
  // POST /api/Autenticacion/ValidarAutenticacion
  login(credentials: { identificadorUsuario: string; contrasena: string }) {
    return this.postQuerys(`${this.RUTA_AUTH}ValidarAutenticacion`, credentials);
  }

  // POST /api/Usuario/set-usuario   (por si quieres registrar desde el front)
  register(model: { nombre: string; correo: string; contrasena: string }) {
    return this.postQuerys(`${this.RUTA_USER}set-usuario`, model);
  }

  // ---------- manejo de sesión ----------
  saveAuthData(token: string, user: { idUsuario:number; nombre:string; correo:string }) {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(user));
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUsuario(): { idUsuario:number; nombre:string; correo:string } | null {
    const raw = localStorage.getItem('usuario');
    return raw ? JSON.parse(raw) : null;
  }

  userId(): number {
    return this.getUsuario()?.idUsuario ?? 0;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const decoded: any = jwtDecode(token);
      const now = Math.floor(Date.now() / 1000);
      return decoded?.exp ? decoded.exp > now : true; // si no trae exp, lo consideramos válido
    } catch {
      return false;
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/login']);
  }
}
