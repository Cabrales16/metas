import { Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';

import { cop } from '../core/format';
import { abreviar } from '../shared/bars';

let contador = 0;
const reducido = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Curva suave que pasa por todos los puntos (Catmull-Rom convertida a Bézier). */
function suave(p: { x: number; y: number }[]): string {
  if (!p.length) return '';
  if (p.length === 1) return `M${p[0].x} ${p[0].y}`;
  let d = `M${p[0].x} ${p[0].y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    d += `C${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6} ${p2.x} ${p2.y}`;
  }
  return d;
}

// ---------------------------------------------------------------- Cifra que cuenta hasta su valor
@Component({ selector: 'app-count-up', template: `{{ texto() }}` })
export class CountUp {
  readonly valor = input.required<number>();
  readonly formato = input<'cop' | 'pct'>('cop');
  readonly duracion = input(1100);
  private readonly actual = signal(0);
  private frame = 0;
  protected readonly texto = computed(() => (this.formato() === 'pct' ? `${Math.round(this.actual())} %` : cop(this.actual())));

  constructor() {
    effect(() => {
      const destino = this.valor();
      const dur = this.duracion();
      const desde = untracked(this.actual);
      cancelAnimationFrame(this.frame);
      if (reducido() || desde === destino) {
        this.actual.set(destino);
        return;
      }
      const t0 = performance.now();
      const paso = (t: number) => {
        const k = Math.min(1, (t - t0) / dur);
        this.actual.set(desde + (destino - desde) * (1 - Math.pow(1 - k, 4)));
        if (k < 1) this.frame = requestAnimationFrame(paso);
      };
      this.frame = requestAnimationFrame(paso);
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
  }
}

// ---------------------------------------------------------------- Área con ventana emergente
export interface PuntoArea {
  etiqueta: string;
  valor: number;
}

@Component({
  selector: 'app-area-chart',
  template: `
    <div class="caja" (pointermove)="mover($event)" (pointerleave)="indice.set(-1)">
      <svg [attr.viewBox]="'0 0 ' + w() + ' ' + alto()" role="img" [attr.aria-label]="descripcion()">
        <defs>
          <linearGradient [attr.id]="gid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" [attr.stop-color]="color()" stop-opacity="0.42" />
            <stop offset="1" [attr.stop-color]="color()" stop-opacity="0" />
          </linearGradient>
        </defs>
        @for (m of marcas(); track m.y) {
          <line class="rejilla" [attr.x1]="pad.izq" [attr.x2]="w() - pad.der" [attr.y1]="m.y" [attr.y2]="m.y" />
          <text class="eje" [attr.x]="pad.izq - 8" [attr.y]="m.y + 4" text-anchor="end">{{ m.texto }}</text>
        }
        <path class="area" [attr.d]="areaD()" [attr.fill]="'url(#' + gid + ')'" />
        <path class="linea" [attr.d]="lineaD()" [attr.stroke]="color()" pathLength="1" />
        @if (sel(); as s) {
          <line class="guia" [attr.x1]="s.x" [attr.x2]="s.x" [attr.y1]="pad.arr" [attr.y2]="alto() - pad.abajo" />
        }
        @for (p of pts(); track p.i) {
          <circle class="punto" [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="indice() === p.i ? 6 : 3.5" [attr.fill]="color()" />
          <text class="eje" [attr.x]="p.x" [attr.y]="alto() - 6" text-anchor="middle">{{ p.etiqueta }}</text>
        }
      </svg>
      @if (sel(); as s) {
        <div class="tip" [style.left.px]="s.x" [style.top.px]="s.y">
          <span>{{ s.etiqueta }}</span>
          <strong>{{ s.texto }}</strong>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .caja {
      position: relative;
      touch-action: pan-y;
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
    }
    .rejilla {
      stroke: rgba(255, 255, 255, 0.08);
    }
    .eje {
      fill: #a9bdb6;
      font-size: 11px;
    }
    .guia {
      stroke: rgba(255, 255, 255, 0.28);
      stroke-dasharray: 3 4;
    }
    .linea {
      fill: none;
      stroke-width: 2.75;
      stroke-linecap: round;
      stroke-dasharray: 1;
      stroke-dashoffset: 1;
      animation: trazar 1.5s cubic-bezier(0.3, 0.7, 0.2, 1) 0.2s forwards;
    }
    .area {
      opacity: 0;
      animation: aparecer 1s ease 0.7s forwards;
    }
    .punto {
      stroke: #0d2723;
      stroke-width: 2;
      transition: r 160ms ease;
    }
    .tip {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 6px 12px;
      font-size: 0.8125rem;
      line-height: 1.3;
      white-space: nowrap;
      pointer-events: none;
      background: #0d2723;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      transform: translate(-50%, -135%);
      animation: aparecer 140ms ease;
    }
    .tip span {
      color: #a9bdb6;
    }
    @keyframes trazar {
      to {
        stroke-dashoffset: 0;
      }
    }
    @keyframes aparecer {
      to {
        opacity: 1;
      }
    }
  `,
})
export class AreaChart {
  readonly puntos = input.required<PuntoArea[]>();
  readonly color = input('#c6ff3d');
  readonly alto = input(220);
  protected readonly gid = 'ag' + ++contador;
  protected readonly pad = { izq: 62, der: 18, arr: 16, abajo: 28 };
  protected readonly w = signal(600);
  protected readonly indice = signal(-1);

  constructor() {
    const el = inject(ElementRef).nativeElement as HTMLElement;
    new ResizeObserver(([e]) => this.w.set(Math.max(260, Math.round(e.contentRect.width)))).observe(el);
  }

  private readonly rango = computed(() => {
    const v = this.puntos().map((p) => p.valor);
    const min = Math.min(0, ...v);
    const max = Math.max(...v, min + 1);
    return { min, max };
  });

  protected y(v: number): number {
    const { min, max } = this.rango();
    return this.pad.arr + (1 - (v - min) / (max - min)) * (this.alto() - this.pad.arr - this.pad.abajo);
  }

  protected readonly pts = computed(() => {
    const p = this.puntos();
    const ancho = this.w() - this.pad.izq - this.pad.der;
    return p.map((d, i) => ({ i, etiqueta: d.etiqueta, valor: d.valor, x: this.pad.izq + (p.length > 1 ? (ancho * i) / (p.length - 1) : ancho / 2), y: this.y(d.valor) }));
  });

  protected readonly lineaD = computed(() => suave(this.pts()));
  protected readonly areaD = computed(() => {
    const p = this.pts();
    if (p.length < 2) return '';
    const base = this.alto() - this.pad.abajo;
    return `${suave(p)}L${p[p.length - 1].x} ${base}L${p[0].x} ${base}Z`;
  });

  protected readonly marcas = computed(() => {
    const { min, max } = this.rango();
    return [min, (min + max) / 2, max].map((valor) => ({ y: this.y(valor), texto: abreviar(valor) }));
  });

  protected readonly sel = computed(() => {
    const p = this.pts()[this.indice()];
    return p ? { x: p.x, y: p.y, etiqueta: p.etiqueta, texto: cop(p.valor) } : null;
  });

  protected readonly descripcion = computed(() => 'Evolución: ' + this.puntos().map((p) => `${p.etiqueta} ${cop(p.valor)}`).join(', '));

  protected mover(e: PointerEvent): void {
    const x = e.clientX - (e.currentTarget as HTMLElement).getBoundingClientRect().left;
    let mejor = -1;
    let dist = Infinity;
    for (const p of this.pts()) {
      const d = Math.abs(p.x - x);
      if (d < dist) {
        dist = d;
        mejor = p.i;
      }
    }
    this.indice.set(mejor);
  }
}

// ---------------------------------------------------------------- Minigráfico
@Component({
  selector: 'app-sparkline',
  template: `
    <svg viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient [attr.id]="gid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" [attr.stop-color]="color()" stop-opacity="0.35" />
          <stop offset="1" [attr.stop-color]="color()" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path class="relleno" [attr.d]="relleno()" [attr.fill]="'url(#' + gid + ')'" />
      <path class="trazo" [attr.d]="trazo()" [attr.stroke]="color()" pathLength="1" vector-effect="non-scaling-stroke" />
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      display: block;
      width: 100%;
      height: 44px;
      overflow: visible;
    }
    .trazo {
      fill: none;
      stroke-width: 2.25;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 1;
      stroke-dashoffset: 1;
      animation: trazar 1.3s ease-out 0.3s forwards;
    }
    .relleno {
      opacity: 0;
      animation: aparecer 0.9s ease 0.8s forwards;
    }
    @keyframes trazar {
      to {
        stroke-dashoffset: 0;
      }
    }
    @keyframes aparecer {
      to {
        opacity: 1;
      }
    }
  `,
})
export class Sparkline {
  readonly valores = input.required<number[]>();
  readonly color = input('#c6ff3d');
  protected readonly gid = 'sp' + ++contador;

  private readonly pts = computed(() => {
    const v = this.valores();
    const min = Math.min(...v);
    const max = Math.max(...v);
    const span = max - min || 1;
    return v.map((x, i) => ({ x: v.length > 1 ? (i / (v.length - 1)) * 100 : 50, y: 31 - ((x - min) / span) * 26 }));
  });
  protected readonly trazo = computed(() => suave(this.pts()));
  protected readonly relleno = computed(() => {
    const p = this.pts();
    return p.length < 2 ? '' : `${suave(p)}L100 36L0 36Z`;
  });
}

// ---------------------------------------------------------------- Anillo de progreso
const C = 2 * Math.PI * 52;

@Component({
  selector: 'app-ring',
  template: `
    <div class="anillo">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle class="pista" cx="60" cy="60" r="52" />
        <circle class="valor" cx="60" cy="60" r="52" [attr.stroke]="color()" [attr.stroke-dasharray]="C" [attr.stroke-dashoffset]="offset()" transform="rotate(-90 60 60)" />
      </svg>
      <div class="centro"><ng-content /></div>
    </div>
  `,
  styles: `
    .anillo {
      position: relative;
      width: 100%;
      max-width: 190px;
      margin: 0 auto;
      aspect-ratio: 1;
    }
    svg {
      width: 100%;
      height: 100%;
    }
    circle {
      fill: none;
      stroke-width: 9;
    }
    .pista {
      stroke: rgba(255, 255, 255, 0.09);
    }
    .valor {
      stroke-linecap: round;
      transition: stroke-dashoffset 1.6s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .centro {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
  `,
})
export class Ring {
  readonly ratio = input.required<number>();
  readonly color = input('#c6ff3d');
  protected readonly C = C;
  private readonly listo = signal(false);
  protected readonly offset = computed(() => (this.listo() ? C * (1 - Math.max(0, Math.min(1, this.ratio()))) : C));

  constructor() {
    const t = setTimeout(() => this.listo.set(true), 120);
    inject(DestroyRef).onDestroy(() => clearTimeout(t));
  }
}

// ---------------------------------------------------------------- Calendario de calor
@Component({
  selector: 'app-heatmap',
  template: `
    <div class="semana" aria-hidden="true">
      @for (d of dias; track $index) {
        <span>{{ d }}</span>
      }
    </div>
    <div class="rejilla">
      @for (c of celdas(); track $index) {
        @if (c) {
          <button type="button" class="c" [class]="'c n' + c.nivel" [style.animation-delay.ms]="$index * 18" [attr.aria-label]="c.etiqueta" [title]="c.etiqueta" (click)="dia.emit(c.fecha)">
            {{ c.dia }}
          </button>
        } @else {
          <span></span>
        }
      }
    </div>
  `,
  styles: `
    .semana,
    .rejilla {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 6px;
    }
    .semana {
      margin-bottom: 6px;
      color: #a9bdb6;
      font-size: 0.75rem;
      text-align: center;
    }
    .c {
      aspect-ratio: 1;
      min-height: 36px;
      color: #f2efe6;
      font: inherit;
      font-size: 0.8125rem;
      font-variant-numeric: tabular-nums;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid transparent;
      border-radius: 10px;
      cursor: pointer;
      opacity: 0;
      transform: scale(0.7);
      animation: entrar 420ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      transition:
        transform 160ms ease,
        border-color 160ms ease;
    }
    .c:hover {
      border-color: rgba(255, 255, 255, 0.5);
      transform: scale(1.08) !important;
    }
    .n1 {
      background: color-mix(in srgb, var(--calor, #ff7a5c) 28%, transparent);
    }
    .n2 {
      background: color-mix(in srgb, var(--calor, #ff7a5c) 48%, transparent);
    }
    .n3 {
      background: color-mix(in srgb, var(--calor, #ff7a5c) 70%, transparent);
    }
    .n4 {
      color: #1b0a05;
      font-weight: 700;
      background: var(--calor, #ff7a5c);
    }
    @keyframes entrar {
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
})
export class Heatmap {
  readonly mes = input.required<string>();
  readonly gastos = input.required<Record<string, number>>();
  readonly dia = output<string>();
  protected readonly dias = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  protected readonly celdas = computed(() => {
    const [y, m] = this.mes().split('-').map(Number);
    const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const primero = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
    const g = this.gastos();
    const max = Math.max(1, ...Object.values(g));
    const lista: ({ dia: number; fecha: string; nivel: number; etiqueta: string } | null)[] = Array.from({ length: primero }, () => null);
    for (let d = 1; d <= total; d++) {
      const fecha = `${this.mes()}-${String(d).padStart(2, '0')}`;
      const v = g[fecha] ?? 0;
      lista.push({ dia: d, fecha, nivel: v > 0 ? Math.max(1, Math.ceil((4 * v) / max)) : 0, etiqueta: v > 0 ? `${d}: gastaste ${cop(v)}` : `${d}: sin gastos` });
    }
    return lista;
  });
}

// ---------------------------------------------------------------- Barras horizontales animadas
export interface ItemBarra {
  id: string;
  nombre: string;
  valor: number;
  color: string;
  icono: string;
}

@Component({
  selector: 'app-hbars',
  template: `
    <ul>
      @for (it of items(); track it.id; let i = $index) {
        <li>
          <button type="button" (click)="elegir.emit(it.id)" [attr.aria-label]="it.nombre + ': ' + etiqueta(it.valor)">
            <span class="av" [style.--c]="it.color"><span class="material-symbols-outlined" aria-hidden="true">{{ it.icono }}</span></span>
            <span class="cuerpo">
              <span class="fila"><span class="nombre">{{ it.nombre }}</span><span class="valor">{{ etiqueta(it.valor) }}</span></span>
              <span class="pista"><span class="rell" [style.width.%]="listo() ? (it.valor / maximo()) * 100 : 0" [style.background]="it.color" [style.transition-delay.ms]="i * 80"></span></span>
            </span>
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    button {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      color: inherit;
      font: inherit;
      text-align: left;
      background: transparent;
      border: 0;
      border-radius: 14px;
      cursor: pointer;
      transition: background-color 160ms ease;
    }
    button:hover {
      background: rgba(255, 255, 255, 0.07);
    }
    .av {
      flex: none;
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      color: var(--c);
      background: color-mix(in srgb, var(--c) 18%, transparent);
      border-radius: 12px;
    }
    .cuerpo {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .fila {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 0.9375rem;
    }
    .nombre {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .valor {
      flex: none;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    .pista {
      display: block;
      height: 8px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      overflow: hidden;
    }
    .rell {
      display: block;
      height: 100%;
      border-radius: 999px;
      transition: width 1s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
  `,
})
export class HBars {
  readonly items = input.required<ItemBarra[]>();
  readonly elegir = output<string>();
  protected readonly listo = signal(false);
  protected readonly maximo = computed(() => Math.max(1, ...this.items().map((i) => i.valor)));
  protected readonly etiqueta = cop;

  constructor() {
    const t = setTimeout(() => this.listo.set(true), 120);
    inject(DestroyRef).onDestroy(() => clearTimeout(t));
  }
}
