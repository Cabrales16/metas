import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { NetService } from '../core/net.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="login">
      <section class="marca" style="background-image: url(img/login-nevado.jpg)">
        <div class="velo">
          <div class="logo"><img class="mark" src="img/marca.svg" alt="" /><span class="wordmark">Metas</span></div>
          <div class="lema">
            <h1>Tus metas, a tu ritmo</h1>
            <p>Ingresos, gastos y ahorros en un solo lugar, hechos a tu medida.</p>
          </div>
        </div>
      </section>

      <main class="panel">
        <form [formGroup]="form" (ngSubmit)="enviar()" novalidate>
          <div class="logo solo-movil"><img class="mark" src="img/marca.svg" alt="" /><span class="wordmark">Metas</span></div>
          <div>
            <h2>Qué bueno verte de nuevo</h2>
            <p class="muted">Inicia sesión para continuar.</p>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Correo</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="username" inputmode="email" />
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

          <button mat-flat-button type="submit" [disabled]="cargando() || !net.online()">
            {{ cargando() ? 'Entrando…' : 'Entrar' }}
          </button>
          @if (!net.online()) {
            <p class="offline">Sin conexión: necesitas internet para iniciar sesión.</p>
          }
        </form>
      </main>
    </div>
  `,
  styles: `
    .login {
      min-height: 100dvh;
      display: grid;
      grid-template-columns: 1.1fr 1fr;
    }
    .marca {
      background-size: cover;
      background-position: center;
    }
    .velo {
      height: 100%;
      min-height: 100dvh;
      padding: 40px 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: #fff;
      background: linear-gradient(to bottom, rgba(15, 14, 13, 0.55), rgba(15, 14, 13, 0.2) 40%, rgba(15, 14, 13, 0.75));
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.5rem;
    }
    .mark {
      width: 40px;
      height: 40px;
    }
    .lema h1 {
      max-width: 420px;
      font-size: 2.5rem;
      line-height: 1.1;
      font-weight: 700;
    }
    .lema p {
      max-width: 400px;
      margin-top: 12px;
      font-size: 1.0625rem;
      opacity: 0.92;
    }
    .panel {
      display: grid;
      place-items: center;
      padding: 32px 20px;
      background: var(--bg);
    }
    form {
      width: 100%;
      max-width: 380px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    h2 {
      font-size: 1.5rem;
      font-weight: 700;
    }
    form .logo {
      color: var(--ink);
    }
    .solo-movil {
      display: none;
    }
    button[type='submit'] {
      height: 48px;
    }
    .offline {
      color: var(--err);
      font-size: 0.875rem;
    }
    @media (max-width: 860px) {
      .login {
        grid-template-columns: 1fr;
      }
      .marca {
        display: none;
      }
      .solo-movil {
        display: flex;
      }
    }
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly net = inject(NetService);

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
