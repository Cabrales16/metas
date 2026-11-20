import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <main class="login">
      <form class="card" [formGroup]="form" (ngSubmit)="enviar()" novalidate>
        <h1>Metas</h1>
        <p class="sub">Inicia sesión para continuar</p>

        <mat-form-field appearance="outline">
          <mat-label>Correo</mat-label>
          <input
            matInput
            type="email"
            formControlName="email"
            autocomplete="username"
            inputmode="email"
          />
          @if (form.controls.email.hasError('required')) {
            <mat-error>Escribe tu correo.</mat-error>
          } @else if (form.controls.email.hasError('email')) {
            <mat-error>Revisa el formato del correo.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Contraseña</mat-label>
          <input
            matInput
            [type]="verClave() ? 'text' : 'password'"
            formControlName="password"
            autocomplete="current-password"
          />
          <button
            matIconButton
            matSuffix
            type="button"
            [attr.aria-label]="verClave() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            [attr.aria-pressed]="verClave()"
            (click)="verClave.set(!verClave())"
          >
            <span class="material-symbols-outlined" aria-hidden="true">{{
              verClave() ? 'visibility_off' : 'visibility'
            }}</span>
          </button>
          @if (form.controls.password.hasError('required')) {
            <mat-error>Escribe tu contraseña.</mat-error>
          }
        </mat-form-field>

        <button mat-flat-button type="submit" [disabled]="cargando()">
          {{ cargando() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </main>
  `,
  styles: `
    .login {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 24px 16px;
    }
    .card {
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      padding: 32px 24px;
      background: var(--mat-sys-surface-container);
      border: 1px solid var(--app-border);
      border-radius: 20px;
    }
    h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
    }
    .sub {
      margin: 4px 0 24px;
      color: var(--app-muted);
    }
    button[type='submit'] {
      height: 48px;
      margin-top: 8px;
    }
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly cargando = signal(false);
  protected readonly verClave = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected async enviar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.signIn(email, password);
      await this.router.navigateByUrl('/inicio');
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.cargando.set(false);
    }
  }
}
