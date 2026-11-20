import { Component, computed, input } from '@angular/core';

import { cop } from '../core/format';

export interface DatoDona {
  etiqueta: string;
  valor: number;
  color: string;
}

const R = 46;
const C = 2 * Math.PI * R;

/** Dona de partes de un todo, con leyenda que lleva los datos (nunca etiquetas sobre las porciones). */
@Component({
  selector: 'app-donut',
  template: `
    <div class="wrap">
      <svg viewBox="0 0 120 120" role="img" [attr.aria-label]="descripcion()">
        <circle cx="60" cy="60" [attr.r]="r" fill="none" stroke="var(--line-2)" stroke-width="14" />
        @for (s of segmentos(); track s.etiqueta) {
          <circle
            cx="60"
            cy="60"
            [attr.r]="r"
            fill="none"
            [attr.stroke]="s.color"
            stroke-width="14"
            [attr.stroke-dasharray]="s.dash"
            [attr.stroke-dashoffset]="s.offset"
            transform="rotate(-90 60 60)"
          />
        }
        <text x="60" y="57" text-anchor="middle" class="t1">{{ centro() }}</text>
        <text x="60" y="73" text-anchor="middle" class="t2">{{ subcentro() }}</text>
      </svg>
      <ul class="leyenda">
        @for (s of segmentos(); track s.etiqueta) {
          <li>
            <i [style.background]="s.color"></i>
            <span class="nombre">{{ s.etiqueta }}</span>
            <span class="num valor">{{ s.pct }}</span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    .wrap {
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }
    svg {
      width: 168px;
      height: 168px;
      flex: none;
    }
    .t1 {
      fill: var(--ink);
      font-size: 11px;
      font-weight: 700;
    }
    .t2 {
      fill: var(--muted);
      font-size: 7px;
    }
    .leyenda {
      flex: 1;
      min-width: 180px;
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9375rem;
    }
    i {
      flex: none;
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .nombre {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .valor {
      color: var(--muted);
      font-weight: 600;
    }
  `,
})
export class Donut {
  readonly datos = input.required<DatoDona[]>();
  readonly centro = input('');
  readonly subcentro = input('');
  protected readonly r = R;

  protected readonly total = computed(() => this.datos().reduce((s, d) => s + d.valor, 0));

  protected readonly segmentos = computed(() => {
    const total = this.total();
    let acumulado = 0;
    return this.datos()
      .filter((d) => d.valor > 0)
      .map((d) => {
        const fraccion = total > 0 ? d.valor / total : 0;
        const largo = fraccion * C;
        const seg = {
          etiqueta: d.etiqueta,
          color: d.color,
          dash: `${Math.max(largo - 1.5, 0.5)} ${C - Math.max(largo - 1.5, 0.5)}`,
          offset: -acumulado,
          pct: `${Math.round(fraccion * 100)} %`,
        };
        acumulado += largo;
        return seg;
      });
  });

  protected readonly descripcion = computed(
    () =>
      'Gastos por categoría: ' +
      this.datos()
        .map((d) => `${d.etiqueta} ${cop(d.valor)}`)
        .join(', '),
  );
}
