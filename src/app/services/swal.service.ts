// src/app/services/swal.service.ts
import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class SwalService {
  success(title: string, text?: string) {
    return Swal.fire({ icon: 'success', title, text, timer: 1800, showConfirmButton: false });
  }
  error(title: string, text?: string) {
    return Swal.fire({ icon: 'error', title, text });
  }
  warn(title: string, text?: string) {
    return Swal.fire({ icon: 'warning', title, text });
  }
  confirm(title: string, text?: string) {
    return Swal.fire({ icon: 'question', title, text, showCancelButton: true, confirmButtonText: 'Sí' });
  }
}
