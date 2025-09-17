import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type Section = { id: string; title: string };

@Component({
  selector: 'app-guia',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './guia.html',
})
export class Guia {
  sections: Section[] = [
    { id: 'inicio-rapido', title: 'Inicio rápido' },
    { id: 'conceptos', title: 'Conceptos clave' },
    { id: 'flujo', title: 'Flujo recomendado' },
    { id: 'transacciones', title: 'Transacciones' },
    { id: 'presupuestos', title: 'Presupuestos y alertas' },
    { id: 'reportes', title: 'Reportes' },
    { id: 'ajustes-saldo', title: 'Ajustes de saldo' },
    { id: 'perfil', title: 'Perfil y seguridad' },
    { id: 'tips', title: 'Tips y atajos' },
    { id: 'faq', title: 'Preguntas frecuentes' },
  ];

  scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
