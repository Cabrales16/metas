import { Component, input, model } from '@angular/core';

import { COLORES } from '../core/catalog';

@Component({
  selector: 'app-color-picker',
  template: `
    <div class="swatches" role="radiogroup" [attr.aria-label]="etiqueta()">
      @for (c of colores; track c.hex) {
        <button
          type="button"
          role="radio"
          class="swatch"
          [style.background]="c.hex"
          [attr.aria-checked]="value() === c.hex"
          [attr.aria-label]="c.nombre"
          (click)="value.set(c.hex)"
        ></button>
      }
    </div>
  `,
  styles: `
    .swatches {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .swatch {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 140ms ease;
    }
    .swatch[aria-checked='true'] {
      border-color: #fff;
      outline: 2px solid var(--app-accent);
      outline-offset: 2px;
    }
    .swatch:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 2px;
    }
  `,
})
export class ColorPicker {
  readonly value = model<string | null>(null);
  readonly etiqueta = input('Color');
  protected readonly colores = COLORES;
}
