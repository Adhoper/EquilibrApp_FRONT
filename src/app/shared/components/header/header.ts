import { Component, EventEmitter, HostListener, inject, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/AuthService.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {
private auth = inject(AuthService);
  private router = inject(Router);

  /** opcional: por si quieres controlar algo desde fuera */
  @Input() showBell = true;

  /** para abrir/cerrar sidebar en mobile */
  @Output() abrirSidebar = new EventEmitter<void>();

  user = this.auth.getUsuario();       // { idUsuario, nombre, correo }
  userName = this.user?.nombre ?? 'Usuario';
  userEmail = this.user?.correo ?? '';
  menuOpen = false;

  initials(name: string) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0]?.toUpperCase())
      .join('');
  }

  onToggleMenu(ev: MouseEvent) {
    ev.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

toggleSidebar() { this.abrirSidebar.emit(); console.log('toggle desde header'); }

  logout() {
    this.auth.logout(); // limpia storage + navega a /login
  }

  @HostListener('document:click')
  closeOnOutsideClick() {
    this.menuOpen = false;
  }
}
