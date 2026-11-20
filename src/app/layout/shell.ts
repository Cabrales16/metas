import { Component, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { formatoDia, hoy } from '../core/dates';
import { NetService } from '../core/net.service';
import { NOMBRE_USUARIO } from '../core/profile';
import { abrirMovimiento } from '../shared/tx-launcher';
import { ThemeService } from '../core/theme.service';
import { UpdateService } from '../core/update.service';

interface Seccion {
  ruta: string;
  etiqueta: string;
  icono: string;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  protected readonly net = inject(NetService);
  protected readonly update = inject(UpdateService);
  protected readonly tema = inject(ThemeService);

  protected readonly contraido = signal(false);

  protected readonly principal: Seccion[] = [
    { ruta: '/inicio', etiqueta: 'Inicio', icono: 'home' },
    { ruta: '/movimientos', etiqueta: 'Movimientos', icono: 'receipt_long' },
    { ruta: '/presupuesto', etiqueta: 'Presupuesto', icono: 'pie_chart' },
    { ruta: '/metas', etiqueta: 'Metas', icono: 'flag' },
  ];
  protected readonly mas: Seccion[] = [
    { ruta: '/mas/cdts', etiqueta: 'CDTs', icono: 'account_balance' },
    { ruta: '/mas/prestamos', etiqueta: 'Por cobrar', icono: 'handshake' },
    { ruta: '/mas/cuentas', etiqueta: 'Cuentas', icono: 'account_balance_wallet' },
    { ruta: '/mas/categorias', etiqueta: 'Categorías', icono: 'category' },
    { ruta: '/mas/importar', etiqueta: 'Importar Monefy', icono: 'upload_file' },
  ];
  protected readonly inferior: Seccion[] = [
    ...this.principal,
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

  protected readonly nombre = NOMBRE_USUARIO;
  protected readonly inicial = NOMBRE_USUARIO.charAt(0).toUpperCase();
  protected readonly fechaHoy = formatoDia(hoy());

  protected nuevoMovimiento(): Promise<void> {
    return abrirMovimiento(this.dialog);
  }

  protected async cerrarSesion(): Promise<void> {
    try {
      await this.auth.signOut();
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    }
  }
}
