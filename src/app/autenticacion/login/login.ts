// src/app/autenticacion/login/login.ts
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/AuthService.service';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private loader = inject(LoaderService);

  showPassword = false;
  loading = false;
  errorMensaje = '';

  emailSuggestions: string[] = [];

  loginForm = this.fb.group({
    identificadorUsuario: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required]],
  });

  constructor() {
    this.emailSuggestions = this.loadRecentEmails();

    // ✅ si vienes desde register, pre-llena email y muestra un aviso breve
    const nav = inject(Router).getCurrentNavigation();
    const state = nav?.extras?.state as any;
    if (state?.email) {
      this.loginForm.patchValue({ identificadorUsuario: state.email });
    }
    if (state?.justRegistered) {
      import('sweetalert2').then(({ default: Swal }) => {
        Swal.fire({
          icon: 'success',
          title: '¡Listo!',
          text: 'Tu cuenta fue creada. Inicia sesión con tus credenciales.',
          timer: 2200,
          showConfirmButton: false,
        });
      });
    }
  }

  invalid(ctrl: string) {
    const c = this.loginForm.get(ctrl);
    return !!c && c.invalid && (c.touched || this.loading);
  }

  onSubmit() {
    this.errorMensaje = '';
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loader.show();
    const creds = this.loginForm.value as any;
    this.auth.login(creds).subscribe({
      next: (res: any) => {
        const u = res?.singleData;
        if (res?.successful && u?.token) {
          // guarda sesión
          this.auth.saveAuthData(u.token, {
            idUsuario: u.idUsuario,
            nombre: u.nombre,
            correo: u.correo,
          });
          // guarda correo en recientes
          this.saveRecentEmail(creds.identificadorUsuario);
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMensaje = res?.message || 'Credenciales inválidas';
        }
        this.loader.hide();
      },
      error: (err) => {
        this.errorMensaje = err?.error?.message || 'Error de red o servidor';
        this.loader.hide();
      },
    });
  }

  // ---- sugerencias de email (localStorage) ----
  private key = 'ea_recent_emails';
  private loadRecentEmails(): string[] {
    try {
      const raw = localStorage.getItem(this.key);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return Array.isArray(arr) ? arr.slice(0, 5) : [];
    } catch {
      return [];
    }
  }
  private saveRecentEmail(email?: string) {
    if (!email) return;
    const set = new Set([email.trim().toLowerCase(), ...this.loadRecentEmails()]);
    const out = Array.from(set).filter(Boolean).slice(0, 5);
    try {
      localStorage.setItem(this.key, JSON.stringify(out));
    } catch {}
    this.emailSuggestions = out;
  }
}
