import { Component, computed, model } from '@angular/core';

import { etiquetaMes, hoy, mesDe, sumarMeses } from '../core/dates';

/** Selector de mes (yyyy-MM): anterior, siguiente y un atajo al mes actual. */
@Component({
  selector: 'app-month-nav',
  template: `
    <div class="nav" role="group" aria-label="Mes">
      <button type="button" class="b" (click)="mover(-1)" aria-label="Mes anterior">
        <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
      </button>
      <span class="mes" aria-live="polite">{{ etiqueta() }}</span>
      <button type="button" class="b" (click)="mover(1)" [disabled]="esActual()" aria-label="Mes siguiente">
        <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
      </button>
      @if (!esActual()) {
        <button type="button" class="hoy" (click)="mes.set(actual)">Este mes</button>
      }
    </div>
  `,
  styles: `
    .nav {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .mes {
      display: inline-block;
      min-width: 150px;
      text-align: center;
      font-weight: 600;
    }
    .mes::first-letter {
      text-transform: uppercase;
    }
    .b {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      color: var(--ink);
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 50%;
      cursor: pointer;
    }
    .b:hover:not(:disabled) {
      background: var(--line-2);
    }
    .b:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .hoy {
      margin-left: 4px;
      padding: 6px 12px;
      color: var(--ink);
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      background: var(--prim-bg);
      border: 0;
      border-radius: 999px;
      cursor: pointer;
    }
  `,
})
export class MonthNav {
  readonly mes = model.required<string>();
  protected readonly actual = mesDe(hoy());
  protected readonly etiqueta = computed(() => etiquetaMes(this.mes()));
  protected readonly esActual = computed(() => this.mes() >= this.actual);

  protected mover(n: number): void {
    this.mes.set(sumarMeses(this.mes(), n));
  }
}
