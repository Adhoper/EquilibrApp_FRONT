import { Component, EventEmitter, HostListener, Input, Output, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../../services/AuthService.service';
import { AlertaService, Alerta } from '../../../services/alerta.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule,RouterLink],
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
    this.alertaSrv.hydrate(this.idUsuario, periodo);
    this.cargarAlertasActual();
    document.addEventListener('click', this._docClickClose);
  }
  ngOnDestroy(): void {
    document.removeEventListener('click', this._docClickClose);
  }
  private _docClickClose = () => { this.menuOpen = false; this.notifOpen = false; };

  initials(name: string) {
    return (name || 'EA').split(' ').filter(Boolean).slice(0,2).map(p => p[0]?.toUpperCase()).join('');
  }
  private periodoActual(): string {
    const d = new Date(); const mm = `${d.getMonth()+1}`.padStart(2,'0'); return `${d.getFullYear()}-${mm}`;
  }

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
    if (next) this.cargarAlertasActual();
  }
  toggleSidebar() { this.abrirSidebar.emit(); }
  logout() { this.auth.logout(); }

  @HostListener('document:click') closeOnOutsideClick() { this.menuOpen = false; this.notifOpen = false; }

  private cargarAlertasActual() {
    if (!this.idUsuario) return;
    const periodo = this.periodoActual();
    this.alertaSrv.setContext(this.idUsuario, periodo);
    this.alertaSrv.refrescar(this.idUsuario, periodo).subscribe({
      next: (r:any) => this.alertaSrv.setFromResponse(r)
    });
  }

  marcarLeida(a: Alerta) {
    this.alertaSrv.marcarLeida(a.idAlerta, this.idUsuario).subscribe({
      next: (res:any) => {
        this.alertas.update(list => list.map(x => x.idAlerta===a.idAlerta ? { ...x, estado:'L' } : x));
        this.alertaSrv.persistCurrent();
        this.toast.show(res?.message || 'Alerta marcada como leída', 'info');
      }
    });
  }

  marcarTodas() {
    const periodo = this.periodoActual();
    this.alertaSrv.marcarTodas(this.idUsuario, periodo).subscribe({
      next: (res:any) => {
        this.alertas.update(list => list.map(x => x.estado==='N' ? { ...x, estado:'L' } : x));
        this.alertaSrv.persistCurrent();
        this.toast.show(res?.message || 'Alertas marcadas como leídas', 'info');
      }
    });
  }

  descartar(a: Alerta) {
    this.alertaSrv.descartar(a.idAlerta, this.idUsuario).subscribe({
      next: (res:any) => {
        this.alertas.update(list => list.filter(x => x.idAlerta !== a.idAlerta));
        this.alertaSrv.persistCurrent();
        this.toast.show(res?.message || 'Alerta descartada', 'info');
      }
    });
  }
}
