import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { Footer } from '../footer/footer';
import { Loader } from "../../../components/loader/loader";
import { CommonModule } from '@angular/common';
import { ToastsComponent } from "../../../components/toasts/toasts";
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Header, Sidebar, Footer, CommonModule, ToastsComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout implements OnInit {

  private toast = inject(ToastService);

ngOnInit(): void {
  //this.toast.success('Toast de prueba visible');

}

  
sidebarVisible = false;

toggleSidebarDesdeHeader() { this.sidebarVisible = !this.sidebarVisible; }
closeSidebar() { this.sidebarVisible = false; }

}
