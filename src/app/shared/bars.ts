import { Component, ElementRef, computed, inject, input, signal } from '@angular/core';

import { cop } from '../core/format';
import { mesCorto } from '../core/dates';

export interface DatoBarras {
  mes: string; // yyyy-MM
  ingresos: number;
  gastos: number;
}

const H = 230;
const PAD = { izq: 68, der: 8, arr: 10, abajo: 28 };

/** Escala con pasos redondos (1, 2, 2.5, 5 × 10^k) y 3-5 marcas. */
export function escalaBonita(max: number): { tope: number; marcas: number[] } {
  if (max <= 0) return { tope: 100, marcas: [0, 50, 100] };
  const pasoBruto = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(pasoBruto)));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= pasoBruto)!;
  const n = Math.ceil(max / paso);
  const tope = paso * n;
  return { tope, marcas: Array.from({ length: n + 1 }, (_, i) => i * paso) };
}

export function abreviar(valor: number): string {
  if (valor === 0) return '$ 0';
  if (valor >= 1_000_000) return `$ ${(valor / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  return `$ ${Math.round(valor / 1000).toLocaleString('es-CO')} mil`;
}

/** Ingresos y gastos por mes: columnas agrupadas sobre un eje con 3-5 líneas tenues. */
@Component({
  selector: 'app-bars',
  template: `
    <div class="leyenda" aria-hidden="true">
      <span><i style="background: var(--ok)"></i>Ingresos</span>
      <span><i style="background: var(--prim)"></i>Gastos</span>
    </div>
    <svg [attr.viewBox]="'0 0 ' + w() + ' ' + h" role="img" [attr.aria-label]="descripcion()">
      @for (m of escala().marcas; track m) {
        <line [attr.x1]="pad.izq" [attr.x2]="w() - pad.der" [attr.y1]="y(m)" [attr.y2]="y(m)" stroke="var(--line)" stroke-width="1" />
        <text [attr.x]="pad.izq - 8" [attr.y]="y(m) + 4" text-anchor="end" class="eje">{{ abreviar(m) }}</text>
      }
      @for (b of barras(); track b.mes) {
        <g>
          <title>{{ b.titulo }}</title>
          <rect [attr.x]="b.xi" [attr.y]="b.yi" [attr.width]="b.ancho" [attr.height]="b.hi" rx="2" style="fill: var(--ok)" />
          <rect [attr.x]="b.xg" [attr.y]="b.yg" [attr.width]="b.ancho" [attr.height]="b.hg" rx="2" style="fill: var(--prim)" />
          <text [attr.x]="b.xc" [attr.y]="h - 8" text-anchor="middle" class="eje">{{ b.etiqueta }}</text>
        </g>
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      width: 100%;
      height: auto;
      display: block;
    }
    .leyenda {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
      color: var(--muted);
      font-size: 0.8125rem;
    }
    .leyenda span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .leyenda i {
      width: 10px;
      height: 10px;
      border-radius: 3px;
    }
    .eje {
      fill: var(--muted);
      font-size: 11px;
      font-family: inherit;
    }
  `,
})
export class Bars {
  readonly datos = input.required<DatoBarras[]>();
  /** Ancho real del contenedor: el gráfico se dibuja a tamaño natural y el texto no se encoge. */
  protected readonly w = signal(600);
  protected readonly h = H;

  constructor() {
    const el = inject(ElementRef).nativeElement as HTMLElement;
    new ResizeObserver(([e]) => this.w.set(Math.max(280, Math.round(e.contentRect.width)))).observe(el);
  }
  protected readonly pad = PAD;
  protected readonly abreviar = abreviar;

  protected readonly escala = computed(() =>
    escalaBonita(Math.max(0, ...this.datos().flatMap((d) => [d.ingresos, d.gastos]))),
  );

  protected y(valor: number): number {
    const { tope } = this.escala();
    return PAD.arr + (1 - valor / tope) * (H - PAD.arr - PAD.abajo);
  }

  protected readonly barras = computed(() => {
    const datos = this.datos();
    const grupo = (this.w() - PAD.izq - PAD.der) / datos.length;
    const ancho = Math.min(26, grupo * 0.3);
    const base = this.y(0);
    return datos.map((d, i) => {
      const centro = PAD.izq + grupo * i + grupo / 2;
      const hi = base - this.y(d.ingresos);
      const hg = base - this.y(d.gastos);
      return {
        mes: d.mes,
        etiqueta: mesCorto(d.mes),
        titulo: `${mesCorto(d.mes)}: ingresos ${cop(d.ingresos)}, gastos ${cop(d.gastos)}`,
        ancho,
        xc: centro,
        xi: centro - ancho - 1,
        xg: centro + 1,
        yi: base - hi,
        yg: base - hg,
        hi,
        hg,
      };
    });
  });

  protected readonly descripcion = computed(
    () =>
      'Ingresos y gastos por mes. ' +
      this.datos()
        .map((d) => `${mesCorto(d.mes)}: ingresos ${cop(d.ingresos)}, gastos ${cop(d.gastos)}`)
        .join('; '),
  );
}
