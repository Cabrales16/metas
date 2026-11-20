import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Banner de sección: foto de fondo, título, una línea de contexto y, a la derecha, las acciones (contenido proyectado). */
@Component({
  selector: 'app-page-hero',
  imports: [RouterLink],
  template: `
    <header class="hero" [style.background-image]="'url(' + imagen() + ')'" [style.background-position]="posicion()">
      <div class="velo">
        <div class="textos">
          @if (volverA(); as ruta) {
            <a class="volver" [routerLink]="ruta" aria-label="Volver a Más">
              <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            </a>
          }
          <h1><span class="barra" aria-hidden="true"></span>{{ titulo() }}</h1>
          @if (subtitulo()) {
            <p>{{ subtitulo() }}</p>
          }
        </div>
        <div class="acciones"><ng-content /></div>
      </div>
    </header>
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: 20px;
    }
    .hero {
      background-size: cover;
      border-radius: 20px;
      overflow: hidden;
    }
    .velo {
      min-height: 138px;
      padding: 22px 26px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      color: #fff;
      background: linear-gradient(to top, rgba(15, 14, 13, 0.84), rgba(15, 14, 13, 0.32) 75%);
    }
    .textos {
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
    h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.01em;
    }
    .barra {
      flex: none;
      width: 5px;
      height: 1.6rem;
      border-radius: 3px;
      background: var(--prim);
    }
    p {
      max-width: 520px;
      font-size: 0.9375rem;
      opacity: 0.92;
    }
    .acciones {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .volver {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      color: #fff;
      background: rgba(255, 255, 255, 0.16);
      border-radius: 50%;
      text-decoration: none;
      transition: background-color 160ms ease;
    }
    .volver:hover {
      background: rgba(255, 255, 255, 0.28);
    }
    @media (max-width: 600px) {
      .velo {
        min-height: 124px;
        padding: 18px;
      }
      h1 {
        font-size: 1.5rem;
      }
    }
  `,
})
export class PageHero {
  readonly titulo = input.required<string>();
  readonly subtitulo = input('');
  readonly imagen = input('img/banner-bogota.jpg');
  readonly posicion = input('center 45%');
  /** Ruta a la que vuelve la flecha (páginas dentro de «Más»). */
  readonly volverA = input<string | null>(null);
}
