import { Component, effect, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly secciones = [
    { ruta: '/inicio', etiqueta: 'Inicio', icono: 'home' },
    { ruta: '/movimientos', etiqueta: 'Movimientos', icono: 'receipt_long' },
    { ruta: '/presupuesto', etiqueta: 'Presupuesto', icono: 'pie_chart' },
    { ruta: '/metas', etiqueta: 'Metas', icono: 'flag' },
    { ruta: '/mas', etiqueta: 'Más', icono: 'more_horiz' },
  ];

  constructor() {
    // Si la sesión se cierra o expira estando dentro, vuelve al login.
    effect(() => {
      if (this.auth.ready() && !this.auth.isAuthenticated()) {
        this.router.navigateByUrl('/login');
      }
    });
  }

  protected async cerrarSesion(): Promise<void> {
    try {
      await this.auth.signOut();
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    }
  }
}
