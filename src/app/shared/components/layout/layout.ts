import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { Footer } from '../footer/footer';
import { CommonModule } from '@angular/common';
import { ToastsComponent } from "../../../components/toasts/toasts";
import { ToastService } from '../../../services/toast.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Header, Sidebar, Footer, CommonModule, ToastsComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout implements OnInit, OnDestroy {
  private toast = inject(ToastService);
  private router = inject(Router);
  private sub = new Subscription();

  sidebarVisible = false;

  ngOnInit(): void {
    // Cierra el sidebar móvil en cualquier navegación
    this.sub.add(
      this.router.events.pipe(filter(e => e instanceof NavigationEnd))
        .subscribe(() => this.closeIfMobile())
    );
    // this.toast.success('Toast de prueba visible');
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  toggleSidebarDesdeHeader() { this.sidebarVisible = !this.sidebarVisible; }
  closeSidebar() { this.sidebarVisible = false; }

  // Llamado cuando el <app-sidebar> emite navigate
  onSidebarNavigate() { this.closeIfMobile(); }

  // Cierra solo si estamos en móvil (tailwind md = 768px)
  private closeIfMobile() {
    if (window.innerWidth < 768) this.closeSidebar();
  }
}
