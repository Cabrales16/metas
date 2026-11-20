import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-mas',
  imports: [RouterLink],
  template: `
    <header class="page-header">
      <h1>Más</h1>
    </header>
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

    <section class="acerca muted">
      <p>
        Metas es una app personal. Se construyó con ayuda de Claude, un asistente de inteligencia artificial,
        revisada y probada por su dueño.
      </p>
      <p class="creditos">
        Imágenes (dominio público, CC0): «Panorámica de Usaquén, Bogotá D.C.» de Alejandro Turola, y «Nevado del
        Quindío» del Servicio Geológico Colombiano, y «Embalse de Guatapé» de Dan Gold (Unsplash), vía Wikimedia Commons; fotografía de moto de aventura de Sakin
        Shrestha, vía WordPress Photo Directory.
      </p>
    </section>
  `,
  styles: `
    .menu {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .menu-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      color: inherit;
      text-decoration: none;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 16px;
      transition: background-color 160ms ease;
    }
    .menu-item:hover {
      background: var(--prim-bg);
    }
    .avatar-icon {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      color: var(--ink);
      background: var(--prim);
      border-radius: 12px;
    }
    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .acerca {
      margin-top: 28px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 620px;
    }
    .creditos {
      font-size: 0.8125rem;
    }
  `,
})
export class Mas {
  protected readonly enlaces = [
    { ruta: '/propuesta', icono: 'auto_awesome', titulo: 'Probar nuevo diseño', detalle: 'Vista previa «Selva»: gráficos, animaciones y fondos' },
    { ruta: '/mas/cdts', icono: 'account_balance', titulo: 'CDTs', detalle: 'Inversiones con su interés neto y vencimientos' },
    { ruta: '/mas/prestamos', icono: 'handshake', titulo: 'Por cobrar', detalle: 'Préstamos que hiciste y sus pagos' },
    { ruta: '/mas/cuentas', icono: 'account_balance_wallet', titulo: 'Cuentas', detalle: 'Efectivo, banco y otras cuentas' },
    { ruta: '/mas/categorias', icono: 'category', titulo: 'Categorías', detalle: 'Gastos e ingresos, con su bolsa' },
    { ruta: '/mas/importar', icono: 'upload_file', titulo: 'Importar Monefy', detalle: 'Sube el CSV de tus movimientos' },
  ];
}
