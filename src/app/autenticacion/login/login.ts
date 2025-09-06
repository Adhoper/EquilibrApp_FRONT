import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/AuthService.service';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  // ✅ fb disponible en inicialización de propiedades
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private loader = inject(LoaderService) 

  showPassword = false;
  loading = false;
  errorMensaje = '';

  // ✅ ya puedes usar this.fb aquí sin error
  loginForm = this.fb.group({
    identificadorUsuario: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required]]
  });

  invalid(ctrl: string){
    const c = this.loginForm.get(ctrl);
    return !!c && c.invalid && (c.touched || this.loading);
  }

  onSubmit(){
    this.errorMensaje = '';
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }

    this.loader.show();
    this.auth.login(this.loginForm.value as any).subscribe({
      next: (res: any) => {
        const u = res?.singleData;
        if (res?.successful && u?.token) {
          this.auth.saveAuthData(u.token, { idUsuario: u.idUsuario, nombre: u.nombre, correo: u.correo });
          this.router.navigate(['/dashboard']); // ajusta si tu ruta es distinta
        } else {
          this.errorMensaje = res?.message || 'Credenciales inválidas';
        }
        this.loader.hide();
      },
      error: (err) => {
        this.errorMensaje = err?.error?.message || 'Error de red o servidor';
        this.loader.hide();
      }
    });
  }
}
