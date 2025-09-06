import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toasts',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="fixed top-4 right-4 z-[9999] space-y-2 min-w-[240px] max-w-[90vw]">
    @for (t of svc.toasts(); track t.id) {
      <div class="px-4 py-3 rounded-lg shadow text-sm cursor-pointer border"
           (click)="t.action?.()"
           [ngClass]="{
             'bg-white text-slate-800 border-slate-200': t.level==='info',
             'bg-emerald-50 text-emerald-800 border-emerald-200': t.level==='success',
             'bg-amber-50 text-amber-800 border-amber-200': t.level==='warn',
             'bg-orange-50 text-orange-800 border-orange-200': t.level==='high',
             'bg-red-50 text-red-800 border-red-200': t.level==='danger'
           }">
        <div class="flex items-start gap-3">
          <span class="pt-0.5">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/>
            </svg>
          </span>
          <div class="flex-1">
            <div class="leading-snug">{{ t.msg }}</div>
            @if (t.actionText) {
              <button type="button"
                class="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline cursor-pointer"
                (click)="$event.stopPropagation(); t.action?.()">
                {{ t.actionText }}
              </button>
            }
          </div>
          <button type="button" class="text-slate-500 hover:text-slate-700 cursor-pointer"
                  (click)="$event.stopPropagation(); svc.dismiss(t.id)">
            ✕
          </button>
        </div>
      </div>
    }
  </div>
  `
})
export class ToastsComponent {
  svc = inject(ToastService);
}
