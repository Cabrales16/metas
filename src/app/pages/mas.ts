import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-mas',
  imports: [RouterLink],
  template: `
    <h1 class="page-title">Más</h1>
    <nav class="menu" aria-label="Más secciones">
      @for (e of enlaces; track e.ruta) {
        <a class="menu-item" [routerLink]="e.ruta">
          <span class="material-symbols-outlined avatar-icon" aria-hidden="true">{{ e.icono }}</span>
          <span class="info">
            <strong>{{ e.titulo }}</strong>
            <span class="muted">{{ e.detalle }}</span>
          </span>
          <span class="material-symbols-outlined muted" aria-hidden="true">chevron_right</span>
        </a>
      }
    </nav>
  `,
  styles: `
    .menu {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
    }
    .menu-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      color: inherit;
      text-decoration: none;
      background: var(--mat-sys-surface-container);
      border: 1px solid var(--app-border);
      border-radius: 16px;
      transition: background-color 160ms ease;
    }
    .menu-item:hover {
      background: var(--mat-sys-surface-container-high);
    }
    .avatar-icon {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      color: var(--app-accent);
      background: color-mix(in srgb, var(--app-accent) 16%, transparent);
      border-radius: 12px;
    }
    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
  `,
})
export class Mas {
  protected readonly enlaces = [
    { ruta: '/mas/cuentas', icono: 'account_balance_wallet', titulo: 'Cuentas', detalle: 'Efectivo, banco y otras cuentas' },
    { ruta: '/mas/categorias', icono: 'category', titulo: 'Categorías', detalle: 'Gastos e ingresos, con su bolsa' },
  ];
}
