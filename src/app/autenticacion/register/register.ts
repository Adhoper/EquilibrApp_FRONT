// src/app/autenticacion/register/register.ts
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/AuthService.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  showPassword = false;
  showConfirm = false;
  loading = false;
  errorMensaje = '';

  emailSuggestions: string[] = [];

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]],
    confirmar: ['', [Validators.required]]
  });

  constructor() {
    this.emailSuggestions = this.loadRecentEmails();
  }

  get mismatch(){ return this.form.value.contrasena !== this.form.value.confirmar; }
  invalid(ctrl: string){
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || this.loading);
  }

onSubmit(){
  this.errorMensaje = '';
  if (this.form.invalid || this.mismatch) { this.form.markAllAsTouched(); return; }

  const payload = {
    nombre: this.form.value.nombre!,
    correo: this.form.value.correo!,
    contrasena: this.form.value.contrasena!
  };

  this.loading = true;
  this.auth.register(payload).subscribe({
    next: async (res:any) => {
      const s = res?.singleData;
      if (res?.successful && s && (s.estatusRegistro === 'CORRECTO' || s.estatusRegistro === 'REACTIVADO')) {
        // guarda correo para sugerencias
        this.saveRecentEmail(payload.correo);
        this.loading = false;

        // ✅ Swal de confirmación antes de ir al login
        const { default: Swal } = await import('sweetalert2');
        const msg = s?.result || res?.message || '¡Registro exitoso! Ahora puedes iniciar sesión.';
        await Swal.fire({
          icon: 'success',
          title: 'Cuenta creada',
          text: msg,
          confirmButtonText: 'Ir a iniciar sesión',
          allowOutsideClick: false
        });

        // pasa el email y una bandera para mostrar aviso en login
        this.router.navigate(['/login'], {
          state: { email: payload.correo, justRegistered: true }
        });
      } else {
        this.errorMensaje = res?.message || s?.result || 'No se pudo registrar';
        this.loading = false;
      }
    },
    error: (err) => {
      this.errorMensaje = err?.error?.message || 'Error de red o servidor';
      this.loading = false;
    }
  });
}

  // ---- sugerencias de email compartidas con Login ----
  private key = 'ea_recent_emails';
  private loadRecentEmails(): string[] {
    try {
      const raw = localStorage.getItem(this.key);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return Array.isArray(arr) ? arr.slice(0, 5) : [];
    } catch { return []; }
  }
  private saveRecentEmail(email?: string) {
    if (!email) return;
    const set = new Set([email.trim().toLowerCase(), ...this.loadRecentEmails()]);
    const out = Array.from(set).filter(Boolean).slice(0, 5);
    try { localStorage.setItem(this.key, JSON.stringify(out)); } catch {}
    this.emailSuggestions = out;
  }
}
