import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { Footer } from '../footer/footer';
import { Loader } from "../../../components/loader/loader";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Header, Sidebar, Footer,CommonModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout {
  
sidebarVisible = false;

toggleSidebarDesdeHeader() { this.sidebarVisible = !this.sidebarVisible; }
closeSidebar() { this.sidebarVisible = false; }

}
