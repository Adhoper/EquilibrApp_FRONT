import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/AuthService.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]],
    confirmar: ['', [Validators.required]]
  });

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
      next: (res:any) => {
        const s = res?.singleData;
        if (res?.successful && s && (s.estatusRegistro === 'CORRECTO' || s.estatusRegistro === 'REACTIVADO')) {
          this.router.navigate(['/login']);
        } else {
          this.errorMensaje = res?.message || s?.result || 'No se pudo registrar';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMensaje = err?.error?.message || 'Error de red o servidor';
        this.loading = false;
      }
    });
  }
}
