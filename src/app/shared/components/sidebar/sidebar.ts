import { Component, EventEmitter, inject, Output } from '@angular/core';
import { AuthService } from '../../../services/AuthService.service';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  private auth = inject(AuthService);
  @Output() navigate = new EventEmitter<void>();

  user = this.auth.getUsuario();
  userName = this.user?.nombre ?? 'Usuario';
  get initial() { return (this.userName || 'E').charAt(0).toUpperCase(); }

  principal: any[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'home' },
    { label: 'Transacciones', path: '/transacciones', icon: 'list' },
  ];
  gestion: any[] = [
    { label: 'Categorías', path: '/categorias', icon: 'tag' },
    { label: 'Cuentas', path: '/cuentas', icon: 'wallet' },
    { label: 'Presupuestos', path: '/presupuestos', icon: 'budget' },
  ];
  reportes: any[] = [
    { label: 'Resumen por categoría', path: '/resumen-categoria', icon: 'pie' },
    { label: 'Saldos por período', path: '/saldos', icon: 'chart' },
  ];
  ajustes: any[] = [
    { label: 'Perfil', path: '/perfil', icon: 'user' },
  ];

  ayuda: any[] = [
    { label: 'Guía', path: '/guia', icon: 'book' },
  ];

  onNav() { this.navigate.emit(); }

  svg(name: string) {
    switch (name) {
      case 'home':   return 'M3 12l2-2 7-7 7 7-2 2v8a1 1 0 01-1 1h-3V13H9v8H6a1 1 0 01-1-1v-8z';
      case 'list':   return 'M4 6h16M4 12h16M4 18h16';
      case 'tag':    return 'M7 7h4l6 6-4 4-6-6V7z';
      case 'wallet': return 'M3 7h14a2 2 0 012 2v6a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2zm12 3h4';
      case 'budget': return 'M4 6h16v4H4zM4 14h10v4H4z';
      case 'pie':    return 'M11 3a9 9 0 019 9h-9V3zM4.06 7.05A9 9 0 0011 21v-9H2a9 9 0 012.06-4.95z';
      case 'chart':  return 'M4 19h16M7 16V8m5 8V5m5 11v-6';
      case 'user':   return 'M16 14a4 4 0 10-8 0v3h8v-3zM12 7a3 3 0 110 6 3 3 0 010-6z';
      // 👇 NUEVO icono libro
      case 'book':   return 'M4 5a2 2 0 012-2h10a2 2 0 012 2v12a1 1 0 01-1 1H6a2 2 0 00-2 2V5zm2 0v12a3 3 0 013-3h8';
      default:       return 'M12 12h.01';
    }
  }
}
