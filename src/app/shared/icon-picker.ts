import { Component, input, model } from '@angular/core';

import { ICONOS_CATEGORIA } from '../core/catalog';

@Component({
  selector: 'app-icon-picker',
  template: `
    <div class="grid" role="radiogroup" [attr.aria-label]="etiqueta()">
      @for (i of iconos; track i) {
        <button
          type="button"
          role="radio"
          class="icon"
          [attr.aria-checked]="value() === i"
          [attr.aria-label]="i.replaceAll('_', ' ')"
          (click)="value.set(i)"
        >
          <span class="material-symbols-outlined" aria-hidden="true">{{ i }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
      gap: 6px;
      max-height: 168px;
      overflow-y: auto;
      padding: 2px;
    }
    .icon {
      height: 44px;
      display: grid;
      place-items: center;
      color: var(--app-muted);
      background: var(--line-2);
      border: 1px solid transparent;
      border-radius: 12px;
      cursor: pointer;
      transition:
        background-color 140ms ease,
        color 140ms ease;
    }
    .icon:hover {
      color: var(--ink);
    }
    .icon[aria-checked='true'] {
      color: var(--ink);
      background: color-mix(in srgb, var(--app-accent) 28%, transparent);
      border-color: var(--app-accent);
    }
    .icon:focus-visible {
      outline: 2px solid var(--ink);
      outline-offset: 1px;
    }
  `,
})
export class IconPicker {
  readonly value = model<string | null>(null);
  readonly etiqueta = input('Ícono');
  protected readonly iconos = ICONOS_CATEGORIA;
}
