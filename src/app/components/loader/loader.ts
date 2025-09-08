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
    class="fixed inset-0 z-[10000] grid place-items-center
           bg-slate-950/60 backdrop-blur-sm
           pointer-events-auto"
    role="status" aria-live="polite" aria-busy="true"
  >
    <div
      class="rounded-2xl bg-slate-900/50 border border-white/10
             px-6 py-5 shadow-2xl shadow-emerald-500/10
             flex flex-col items-center gap-3 select-none"
    >
      <!-- Spinner -->
      <div class="relative">
        <!-- aro principal -->
        <div
          class="h-14 w-14 rounded-full border-4
                 border-white/10 border-t-emerald-400
                 motion-safe:animate-spin motion-reduce:animate-none"
        ></div>
        <!-- glow suave -->
        <div class="absolute inset-0 rounded-full ring-2 ring-emerald-400/25 blur-[2px]"></div>
        <!-- marca -->
        <div class="absolute inset-0 grid place-items-center">
          <span class="text-[11px] font-extrabold tracking-widest text-emerald-300">EA</span>
        </div>
      </div>

      <!-- Texto -->
      <span class="text-sm text-slate-200">
        Cargando <span class="text-emerald-400 font-semibold">EquilibrApp</span>…
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
