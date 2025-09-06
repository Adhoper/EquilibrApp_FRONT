// src/app/shared/header/header.ts
import { Component, EventEmitter, HostListener, Input, Output, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../../services/AuthService.service';
import { AlertaService, Alerta } from '../../../services/alerta.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private alertaSrv = inject(AlertaService);
  private toast = inject(ToastService);

  @Input() showBell = true;
  @Output() abrirSidebar = new EventEmitter<void>();

  user = this.auth.getUsuario();
  userName = this.user?.nombre ?? 'Usuario';
  userEmail = this.user?.correo ?? '';
  idUsuario = this.user?.idUsuario ?? 0;

  menuOpen = false;
  notifOpen = false;

  alertas = this.alertaSrv.alertas;
  unreadCount() { return this.alertas().filter(a => a.estado === 'N').length; }

  ngOnInit(): void {
    if (!this.idUsuario) return;
    const periodo = this.periodoActual();

    // 1) Contexto + hidratar desde localStorage (N y L, excluye D)
    this.alertaSrv.hydrate(this.idUsuario, periodo);

    // 2) Sincronizar con backend (listar-alertas => N y L)
    this.cargarAlertasActual();

    document.addEventListener('click', this._docClickClose);
  }
  ngOnDestroy(): void {
    document.removeEventListener('click', this._docClickClose);
  }
  private _docClickClose = () => { this.menuOpen = false; this.notifOpen = false; };

  // === helpers ===
  initials(name: string) {
    return (name || 'EA').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
  }
  private periodoActual(): string {
    const d = new Date(); const mm = `${d.getMonth()+1}`.padStart(2,'0'); return `${d.getFullYear()}-${mm}`;
  }

  // === UI ===
  onToggleMenu(ev: MouseEvent) {
    ev.stopPropagation();
    this.menuOpen = !this.menuOpen;
    this.notifOpen = false;
  }
  onToggleNotif(ev: MouseEvent) {
    ev.stopPropagation();
    const next = !this.notifOpen;
    this.notifOpen = next;
    this.menuOpen = false;
    // refrescamos al abrir el panel para traer cambios del server
    if (next) this.cargarAlertasActual();
  }
  toggleSidebar() { this.abrirSidebar.emit(); }
  logout() { this.auth.logout(); }

  @HostListener('document:click') closeOnOutsideClick() { this.menuOpen = false; this.notifOpen = false; }

  // === backend alertas ===
  private cargarAlertasActual() {
    if (!this.idUsuario) return;
    const periodo = this.periodoActual();

    // define contexto para clave de storage y persiste tras set
    this.alertaSrv.setContext(this.idUsuario, periodo);

    // SIN 'estado' => backend debe devolver N y L (excluye D)
    this.alertaSrv.refrescar(this.idUsuario, periodo).subscribe({
      next: (r:any) => this.alertaSrv.setFromResponse(r) // set + persist
    });
  }

  marcarLeida(a: Alerta) {
    this.alertaSrv.marcarLeida(a.idAlerta, this.idUsuario).subscribe({
      next: (res:any) => {
        this.alertas.update(list => list.map(x => x.idAlerta===a.idAlerta ? { ...x, estado:'L' } : x));
        this.alertaSrv.persistCurrent(); // << persistir cambio
        this.toast.show(res?.message || 'Alerta marcada como leída', 'info');
      }
    });
  }

  marcarTodas() {
    const periodo = this.periodoActual();
    this.alertaSrv.marcarTodas(this.idUsuario, periodo).subscribe({
      next: (res:any) => {
        this.alertas.update(list => list.map(x => x.estado==='N' ? { ...x, estado:'L' } : x));
        this.alertaSrv.persistCurrent(); // << persistir cambio
        this.toast.show(res?.message || 'Alertas marcadas como leídas', 'info');
      }
    });
  }

  descartar(a: Alerta) {
    this.alertaSrv.descartar(a.idAlerta, this.idUsuario).subscribe({
      next: (res:any) => {
        this.alertas.update(list => list.filter(x => x.idAlerta !== a.idAlerta));
        this.alertaSrv.persistCurrent(); // << persistir cambio
        this.toast.show(res?.message || 'Alerta descartada', 'info');
      }
    });
  }
}
