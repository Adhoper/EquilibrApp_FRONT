import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- loader.component.html inline -->
    @if (isLoading$ | async) {
    <div
      class="fixed inset-0 z-[10000] grid place-items-center bg-slate-900/10"
      style="pointer-events: all"
    >
      <div
        class="flex flex-col items-center gap-3 pointer-events-none"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div class="relative">
          <div
            class="h-12 w-12 rounded-full border-4 border-emerald-400/30 border-t-emerald-500 motion-safe:animate-spin"
          ></div>
          <div class="absolute inset-0 grid place-items-center">
            <span class="text-xs font-extrabold text-emerald-500 tracking-wider">EA</span>
          </div>
        </div>
        <span class="text-sm text-slate-800">
          Cargando <span class="text-emerald-600 font-semibold">EquilibrApp</span>…
        </span>
      </div>
    </div>
    }
  `,
})
export class Loader implements OnInit {
  isLoading$: any;

  constructor(private loaderService: LoaderService) {}

  ngOnInit(): void {
    this.isLoading$ = this.loaderService.loading$;
  }
}
