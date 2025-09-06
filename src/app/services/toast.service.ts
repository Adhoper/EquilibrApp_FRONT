import { Injectable, signal } from '@angular/core';

export type ToastLevel = 'info' | 'success' | 'warn' | 'danger' | 'high';

export interface ToastItem {
  id: number;
  msg: string;
  level: ToastLevel;
  actionText?: string;
  action?: () => void;
  timeoutMs?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _seq = 0;
  private readonly DEFAULT_TIMEOUT: Record<ToastLevel, number> = {
    info: 4000,
    success: 3500,
    warn: 6000,
    danger: 7000,
    high: 6500,
  };

  private _toasts = signal<ToastItem[]>([]);
  toasts = this._toasts.asReadonly();

  show(
    msg: string,
    level: ToastLevel = 'info',
    opts?: { actionText?: string; action?: () => void; timeoutMs?: number }
  ) {
    const id = ++this._seq;
    const item: ToastItem = {
      id,
      msg,
      level,
      actionText: opts?.actionText,
      action: opts?.action,
      timeoutMs: opts?.timeoutMs ?? this.DEFAULT_TIMEOUT[level],
    };
    this._toasts.update(list => [item, ...list]);

    // auto-dismiss
    if (item.timeoutMs && item.timeoutMs > 0) {
      setTimeout(() => this.dismiss(id), item.timeoutMs);
    }
    return id;
  }

  // helpers
  info(msg: string, opts?: Partial<Omit<ToastItem, 'id' | 'msg' | 'level'>>) {
    this.show(msg, 'info', opts);
  }
  success(msg: string, opts?: Partial<Omit<ToastItem, 'id' | 'msg' | 'level'>>) {
    this.show(msg, 'success', opts);
  }
  warn(msg: string, opts?: Partial<Omit<ToastItem, 'id' | 'msg' | 'level'>>) {
    this.show(msg, 'warn', opts);
  }
  danger(msg: string, opts?: Partial<Omit<ToastItem, 'id' | 'msg' | 'level'>>) {
    this.show(msg, 'danger', opts);
  }
  high(msg: string, opts?: Partial<Omit<ToastItem, 'id' | 'msg' | 'level'>>) {
    this.show(msg, 'high', opts);
  }

  dismiss(id: number) {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }

  clear() {
    this._toasts.set([]);
  }
}
