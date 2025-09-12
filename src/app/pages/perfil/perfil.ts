import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/AuthService.service';
import { LoaderService } from '../../services/loader.service';
import { SwalService } from '../../services/swal.service';
import { UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './perfil.html',
})
export class Perfil implements OnInit {
  private fb = inject(FormBuilder);
  private usuarioSrv = inject(UsuarioService);
  private auth = inject(AuthService);
  private loader = inject(LoaderService);
  private swal = inject(SwalService);
  private router = inject(Router);

  user = this.auth.getUsuario();
  idUsuario = this.user?.idUsuario ?? 0;

  // UI
  showCurrent = signal(false);
  showNew = signal(false);
  showConfirm = signal(false);

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    correo: [{ value: '', disabled: true }],
    contrasenaActual: [''],
    contrasenaNueva: [''],
    confirmarNueva: [''],
  }, { validators: [matchPasswordValidator('contrasenaNueva', 'confirmarNueva')] });

  ngOnInit(): void {
    this.form.patchValue({
      nombre: this.user?.nombre || this.user?.nombre || '',
      correo: this.user?.correo || '',
    });

    // Si escribe nueva contraseña → exigir actual y confirmación
    this.form.get('contrasenaNueva')!.valueChanges.subscribe(v => {
      const wants = !!(v && String(v).trim());
      const currentCtrl = this.form.get('contrasenaActual')!;
      const newCtrl = this.form.get('contrasenaNueva')!;
      const confCtrl = this.form.get('confirmarNueva')!;

      if (wants) {
        currentCtrl.addValidators([Validators.required]);
        newCtrl.addValidators([Validators.minLength(6)]);
        confCtrl.addValidators([Validators.required]);
      } else {
        currentCtrl.clearValidators();
        newCtrl.clearValidators();
        confCtrl.clearValidators();
        this.form.patchValue({ contrasenaActual: '', confirmarNueva: '' }, { emitEvent: false });
      }
      currentCtrl.updateValueAndValidity({ emitEvent: false });
      newCtrl.updateValueAndValidity({ emitEvent: false });
      confCtrl.updateValueAndValidity({ emitEvent: false });
    });
  }

  get f() { return this.form.controls; }
  isInvalid(name: string) {
    const c = this.form.get(name)!;
    return c.invalid && (c.dirty || c.touched);
  }

  cancelarCambioPass() {
    this.form.patchValue({ contrasenaActual: '', contrasenaNueva: '', confirmarNueva: '' });
    this.form.get('contrasenaActual')!.markAsPristine();
    this.form.get('contrasenaNueva')!.markAsPristine();
    this.form.get('confirmarNueva')!.markAsPristine();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.swal.warn('Revisa los datos', 'Hay campos incompletos o inválidos.');
      return;
    }

    const v = this.form.getRawValue();
    const nombreNuevo = (v.nombre || '').trim();
    const nombreActual = (this.user?.nombre || this.user?.nombre || '').trim();

    const cambiaraPass = !!(v.contrasenaNueva && v.contrasenaNueva.trim());
    const nombreSinCambios = nombreNuevo === nombreActual;

    if (nombreSinCambios && !cambiaraPass) {
      this.swal.warn('Sin cambios', 'No hay cambios que guardar.');
      return;
    }

    const payload = {
      idUsuario: this.idUsuario,
      nombre: nombreSinCambios ? null : nombreNuevo,
      contrasenaActual: cambiaraPass ? v.contrasenaActual : null,
      contrasenaNueva:  cambiaraPass ? v.contrasenaNueva  : null,
    };

    this.loader.show();
    this.usuarioSrv.ActualizarUsuario(payload).subscribe({
      next: (res: any) => {
        this.loader.hide();

        // éxito solo si el SP devolvió OK
        const estado = res?.singleData?.estado;
        const ok = (res?.successful === true) || (estado === 'OK');

        if (!ok) {
          const msg =
            res?.singleData?.mensaje ||
            res?.message ||
            'No se pudo actualizar el perfil.';
          // Marca el campo actual con error de servidor si aplica
          if (estado === 'RECHAZADO') {
            this.f.contrasenaActual.setErrors({ server: true });
          }
          this.swal.warn('No se guardó', msg);
          return;
        }

        // Refrescar nombre local si cambió
        if (payload.nombre) {
          try {
            const u = this.auth.getUsuario() || {};
            (this.auth as any).updatePerfil?.({ nombre: payload.nombre });
            (this.auth as any).setUsuario?.({ ...u, nombre: payload.nombre, nombreMostrar: payload.nombre });
            const key = 'ea_user';
            const stored = JSON.parse(localStorage.getItem(key) || 'null') || u;
            localStorage.setItem(key, JSON.stringify({ ...stored, nombre: payload.nombre, nombreMostrar: payload.nombre }));
          } catch {}
        }
        if (cambiaraPass) this.cancelarCambioPass();

        const msg = (res?.singleData?.mensaje || res?.message || 'Perfil actualizado correctamente.') as string;
        // Confirm para reloguear
        import('sweetalert2').then(({ default: Swal }) => {
          Swal.fire({
            icon: 'success',
            title: 'Perfil actualizado',
            html: `${msg}<br><br><b>Para ver los cambios en toda la app, vuelve a iniciar sesión.</b>`,
            showCancelButton: true,
            confirmButtonText: 'Iniciar sesión ahora',
            cancelButtonText: 'Más tarde',
            reverseButtons: true,
            allowOutsideClick: false,
          }).then(({ isConfirmed }) => { if (isConfirmed) this.reloginNow(); });
        });
      },
      error: (err) => {
        this.loader.hide();
        const msg =
          err?.error?.singleData?.mensaje ||
          err?.error?.message ||
          'No se pudo actualizar el perfil.';
        this.swal.error('Error', msg);
      }
    });
  }

  private reloginNow() {
    try { (this.auth as any).logout?.(); } catch {}
    try { localStorage.removeItem('ea_token'); localStorage.removeItem('ea_user'); } catch {}
    this.router.navigateByUrl('/login').catch(() => (location.href = '/login'));
  }
}

/** Validador: confirmar igual a nueva */
function matchPasswordValidator(nuevaKey: string, confirmKey: string) {
  return (group: AbstractControl): ValidationErrors | null => {
    const nueva = (group.get(nuevaKey)?.value || '').toString();
    const conf  = (group.get(confirmKey)?.value || '').toString();
    if (!nueva && !conf) return null;
    return nueva === conf ? null : { mismatch: true };
  };
}
