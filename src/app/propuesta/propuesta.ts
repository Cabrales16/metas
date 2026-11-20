import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

import { AccountsService } from '../core/accounts.service';
import { gastoPorBolsa, gastosPorCategoria, saldosPorCuenta, totalesDelMes, totalesPorMes } from '../core/aggregates';
import { calcularPresupuesto, reglasVigentes } from '../core/budget';
import { BudgetService } from '../core/budget.service';
import { diasAlVencimiento, requiereAlerta } from '../core/cdt';
import { COLOR_POR_DEFECTO, colorDe, etiquetaBolsa } from '../core/catalog';
import { CategoriesService } from '../core/categories.service';
import { CopPipe } from '../core/cop.pipe';
import { etiquetaMes, formatoFecha, hoy, horaBogota, mesCorto, mesDe, rangoMes, sumarMeses } from '../core/dates';
import { cop, copConSigno } from '../core/format';
import { ahorroMensualNecesario, imagenDeMeta, progresoMeta, totalAportado } from '../core/goals';
import { GoalsService } from '../core/goals.service';
import { InvestmentsService } from '../core/investments.service';
import { NOMBRE_USUARIO, saludo } from '../core/profile';
import { saldoPendiente } from '../core/receivables';
import { ReceivablesService } from '../core/receivables.service';
import { RefreshService } from '../core/refresh.service';
import { Tx, TransactionsService } from '../core/transactions.service';
import { Bars } from '../shared/bars';
import { Donut, DatoDona } from '../shared/donut';
import { DetalleDialog, FilaDetalle } from './detalle-dialog';
import { AreaChart, CountUp, HBars, Heatmap, ItemBarra, PuntoArea, Ring, Sparkline } from './graficos';

interface Delta {
  texto: string;
  clase: 'bien' | 'mal' | 'neutro';
}

const FONDOS = [
  { id: 'guatape', img: 'img/banner-guatape.jpg', nombre: 'Guatapé' },
  { id: 'nevado', img: 'img/login-nevado.jpg', nombre: 'Nevado del Quindío' },
  { id: 'bogota', img: 'img/banner-bogota.jpg', nombre: 'Bogotá' },
  { id: 'aurora', img: null, nombre: 'Aurora' },
] as const;
const CLAVE_FONDO = 'metas-fondo';
const PALETA = ['#c6ff3d', '#ff7a5c', '#38d6c4', '#a596ff', '#f4d68f', '#ff9ec1', '#7fb8ff'];

const leerFondo = (): string => {
  try {
    const v = localStorage.getItem(CLAVE_FONDO);
    return FONDOS.some((f) => f.id === v) ? v! : 'guatape';
  } catch {
    return 'guatape';
  }
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Propuesta de diseño «Selva»: fondos con foto, tarjetas de distinto tamaño y un gráfico para cada dato. */
@Component({
  selector: 'app-propuesta',
  imports: [RouterLink, CopPipe, CountUp, AreaChart, Sparkline, Ring, Heatmap, HBars, Bars, Donut],
  template: `
    <div class="escena">
      <div class="capas" aria-hidden="true">
        @for (f of conImagen; track f.id) {
          <div class="capa" [class.on]="fondo() === f.id" [style.background-image]="'url(' + f.img + ')'"></div>
        }
        <div class="velo"></div>
        <div class="blob b1"></div>
        <div class="blob b2"></div>
        <div class="blob b3"></div>
      </div>

      @if (refresh.recargando()) {
        <div class="progreso-top" role="progressbar" aria-label="Actualizando datos"></div>
      }

      <header class="barra">
        <a class="logo" routerLink="/inicio" aria-label="Volver al diseño actual">
          <img src="img/marca.svg" alt="" />
          <span class="wordmark">Metas</span>
        </a>

        <div class="mes" role="group" aria-label="Mes">
          <button type="button" (click)="moverMes(-1)" aria-label="Mes anterior">
            <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
          </button>
          <span aria-live="polite">{{ etiquetaMes() }}</span>
          <button type="button" (click)="moverMes(1)" [disabled]="esActual()" aria-label="Mes siguiente">
            <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
          </button>
        </div>

        <div class="herr">
          <span class="actualizado">{{ hace() }}</span>
          <button type="button" class="ib" (click)="recargar()" [disabled]="refresh.recargando()" aria-label="Actualizar datos" title="Actualizar datos">
            <span class="material-symbols-outlined" [class.girar]="refresh.recargando()" aria-hidden="true">refresh</span>
          </button>
          <button type="button" class="ib" (click)="siguienteFondo()" [attr.aria-label]="'Cambiar el fondo. Ahora: ' + nombreFondo()" [title]="'Fondo: ' + nombreFondo()">
            <span class="material-symbols-outlined" aria-hidden="true">wallpaper</span>
          </button>
          <a class="ib texto" routerLink="/inicio" title="Volver al diseño actual">
            <span class="material-symbols-outlined" aria-hidden="true">dashboard</span><span class="solo-ancho">Diseño actual</span>
          </a>
          <button type="button" class="nuevo" (click)="nuevo()">
            <span class="material-symbols-outlined" aria-hidden="true">add</span>Nuevo
          </button>
        </div>
      </header>

      <main class="contenido">
        @if (fallo()) {
          <div class="falla">
            <p>No se pudieron cargar tus datos.</p>
            <button type="button" class="nuevo" (click)="cargar()">Reintentar</button>
          </div>
        } @else if (cargando()) {
          <div class="bento" aria-busy="true" aria-label="Cargando tus datos">
            @for (e of esqueletos; track $index) {
              <div [class]="'tile esq ' + e.c" [style.--i]="$index">
                <span class="e-linea ancha"></span>
                <span class="e-linea corta"></span>
                <span class="e-bloque" [style.height.px]="e.h"></span>
              </div>
            }
          </div>
        } @else {
          <div class="bento" [class.refrescando]="refresh.recargando()">
            <section class="tile hero" style="--i: 0">
              <div class="hero-cab">
                <div>
                  <p class="saludo">{{ saludoTexto }}, {{ nombre }}</p>
                  <p class="hallazgo">{{ hallazgo() }}</p>
                </div>
                <span class="etiqueta">Disponible en tus cuentas</span>
              </div>
              <div class="cifra"><app-count-up [valor]="disponible()" /></div>
              <span class="chip-d" [class]="'chip-d ' + variacion().clase">{{ variacion().texto }}</span>
              <app-area-chart [puntos]="patrimonio()" [alto]="300" />
            </section>

            <section class="tile ahorro" style="--i: 1">
              <h2 class="t-tit">Ahorro del mes</h2>
              <app-ring [ratio]="presupuesto().ahorro.ratio">
                <span class="r-num"><app-count-up formato="pct" [valor]="pctAhorro()" /></span>
                <span class="r-sub">de la meta</span>
              </app-ring>
              <p class="pie num">{{ presupuesto().ahorro.real | cop }} de {{ presupuesto().ahorro.meta | cop }}</p>
            </section>

            <section class="tile bolsas" style="--i: 2">
              <h2 class="t-tit">Bolsas del presupuesto</h2>
              @for (b of presupuesto().bolsas; track b.bucket) {
                <div class="bolsa">
                  <div class="fila"><span>{{ etiqueta(b.bucket) }} <small>{{ b.percent }} %</small></span><span class="num">{{ b.gastado | cop }}</span></div>
                  <div class="pista"><span [class]="'rell ' + (presupuesto().base > 0 ? b.estado : 'ok')" [style.width.%]="presupuesto().base > 0 ? tope(b.ratio) : 0"></span></div>
                </div>
              }
              @if (presupuesto().base === 0) {
                <p class="nota">Aún no hay ingresos este mes: el presupuesto se calcula sobre ellos.</p>
              }
            </section>

            @for (k of kpis(); track k.id; let i = $index) {
              <section class="tile kp" [style.--i]="3 + i">
                <span class="t-tit">{{ k.titulo }}</span>
                <span class="k-valor" [style.color]="k.color"><app-count-up [valor]="k.valor" /></span>
                <span class="chip-d" [class]="'chip-d ' + k.delta.clase">{{ k.delta.texto }}</span>
                <app-sparkline [valores]="k.serie" [color]="k.color" />
              </section>
            }

            <section class="tile calor" style="--i: 6">
              <div class="cab-t">
                <h2 class="t-tit">Gasto día a día</h2>
                <span class="leyenda" aria-hidden="true">menos <i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i> más</span>
              </div>
              <app-heatmap [mes]="mes()" [gastos]="gastosPorDia()" (dia)="verDia($event)" />
              <p class="nota">Toca un día para ver sus movimientos.</p>
            </section>

            <section class="tile cats" style="--i: 7">
              <div class="cab-t">
                <h2 class="t-tit">En qué se va tu plata</h2>
                <div class="seg" role="group" aria-label="Tipo de gráfico">
                  <button type="button" [attr.aria-pressed]="vistaCat() === 'barras'" (click)="vistaCat.set('barras')">Barras</button>
                  <button type="button" [attr.aria-pressed]="vistaCat() === 'dona'" (click)="vistaCat.set('dona')">Dona</button>
                </div>
              </div>
              @if (categorias().length) {
                @if (vistaCat() === 'barras') {
                  <app-hbars [items]="categorias()" (elegir)="verCategoria($event)" />
                } @else {
                  <app-donut [datos]="dona()" [centro]="gastosTexto()" subcentro="en gastos" />
                }
              } @else {
                <p class="vacio">Sin gastos este mes. Cuando registres uno, aparece aquí.</p>
              }
            </section>

            <section class="tile seis" style="--i: 8">
              <h2 class="t-tit">Últimos seis meses</h2>
              <app-bars [datos]="serie()" />
            </section>

            <section class="tile rec" style="--i: 9">
              <h2 class="t-tit">Últimos movimientos</h2>
              <ul>
                @for (r of recientes(); track r.id; let i = $index) {
                  <li [style.animation-delay.ms]="i * 70">
                    <span class="av" [style.--c]="r.color"><span class="material-symbols-outlined" aria-hidden="true">{{ r.icono }}</span></span>
                    <span class="info"><strong>{{ r.titulo }}</strong><small>{{ r.fecha }} · {{ r.cuenta }}</small></span>
                    <span class="monto num" [class.pos]="r.kind === 'income'">{{ r.signo }}{{ r.monto | cop }}</span>
                  </li>
                } @empty {
                  <li class="vacio">Aún no hay movimientos.</li>
                }
              </ul>
            </section>

            @if (meta(); as m) {
              <a class="tile meta" routerLink="/metas" style="--i: 10">
                @if (m.imagen) {
                  <span class="portada" [style.background-image]="'url(' + m.imagen + ')'"></span>
                }
                <span class="m-cuerpo">
                  <span class="t-tit">Tu meta principal</span>
                  <strong>{{ m.nombre }}</strong>
                  <span class="num">{{ m.aportado | cop }} de {{ m.objetivo | cop }}</span>
                  @if (m.mensual !== null && m.mensual > 0) {
                    <span class="nota">Para llegar a tiempo: {{ m.mensual | cop }} al mes.</span>
                  }
                </span>
                <span class="m-anillo">
                  <app-ring [ratio]="m.pct / 100" color="#38d6c4"><span class="r-num chico">{{ m.pct }} %</span></app-ring>
                </span>
              </a>
            } @else {
              <a class="tile meta vacia" routerLink="/metas" style="--i: 10">
                <span class="material-symbols-outlined" aria-hidden="true">flag</span>
                <strong>Crea tu primera meta</strong>
                <span class="nota">Por ejemplo, la moto: valor, fecha y a seguirla.</span>
              </a>
            }

            <section class="tile avisos" style="--i: 11">
              <h2 class="t-tit">Para estar al tanto</h2>
              @for (a of avisos(); track a.texto) {
                <a [routerLink]="a.ruta" class="aviso" [class.alerta]="a.alerta">
                  <span class="material-symbols-outlined" aria-hidden="true">{{ a.icono }}</span>
                  <span>{{ a.texto }}</span>
                </a>
              } @empty {
                <p class="vacio">Nada pendiente por ahora.</p>
              }
            </section>
          </div>
        }
      </main>
    </div>
  `,
  styles: `
    :host {
      --tile: rgba(8, 34, 29, 0.66);
      --borde: rgba(255, 255, 255, 0.11);
      --txt: #f2efe6;
      --suave: #a9bdb6;
      --acento: #c6ff3d;
      --coral: #ff7a5c;
      --aqua: #38d6c4;
      --calor: #ff7a5c;
      /* Variables que usan los gráficos compartidos de la app. */
      --ink: #f2efe6;
      --muted: #a9bdb6;
      --line: rgba(255, 255, 255, 0.12);
      --line-2: rgba(255, 255, 255, 0.08);
      --ok: #c6ff3d;
      --prim: #ff7a5c;
      display: block;
      color: var(--txt);
      font-family: 'Geist', system-ui, sans-serif;
    }
    .escena {
      position: relative;
      min-height: 100dvh;
      background: #04201c;
      isolation: isolate;
    }
    .capas {
      position: fixed;
      inset: 0;
      z-index: -1;
      overflow: hidden;
    }
    .capa {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      opacity: 0;
      transform: scale(1.08);
      transition:
        opacity 1s ease,
        transform 9s ease-out;
    }
    .capa.on {
      opacity: 1;
      transform: scale(1);
    }
    .velo {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(4, 28, 24, 0.8), rgba(4, 28, 24, 0.92));
    }
    .blob {
      position: absolute;
      width: 46vmax;
      height: 46vmax;
      border-radius: 50%;
      filter: blur(72px);
      opacity: 0.5;
      mix-blend-mode: screen;
    }
    .b1 {
      top: -14vmax;
      left: -12vmax;
      background: radial-gradient(circle, rgba(198, 255, 61, 0.5), transparent 62%);
      animation: deriva1 22s ease-in-out infinite alternate;
    }
    .b2 {
      top: 16vmax;
      right: -16vmax;
      background: radial-gradient(circle, rgba(56, 214, 196, 0.5), transparent 62%);
      animation: deriva2 27s ease-in-out infinite alternate;
    }
    .b3 {
      bottom: -18vmax;
      left: 24vw;
      background: radial-gradient(circle, rgba(165, 150, 255, 0.42), transparent 62%);
      animation: deriva1 31s ease-in-out infinite alternate-reverse;
    }
    @keyframes deriva1 {
      to {
        transform: translate(9vmax, 6vmax) scale(1.18);
      }
    }
    @keyframes deriva2 {
      to {
        transform: translate(-10vmax, 8vmax) scale(1.12);
      }
    }
    .progreso-top {
      position: fixed;
      inset: 0 0 auto 0;
      z-index: 50;
      height: 3px;
      overflow: hidden;
    }
    .progreso-top::after {
      content: '';
      position: absolute;
      inset: 0 auto 0 -35%;
      width: 35%;
      background: var(--acento);
      border-radius: 0 3px 3px 0;
      animation: barrido 1.1s ease-in-out infinite;
    }
    @keyframes barrido {
      to {
        left: 100%;
      }
    }

    /* ---- Barra superior ---- */
    .barra {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px 16px;
      padding: 12px 24px;
      background: rgba(4, 28, 24, 0.55);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--borde);
    }
    .logo {
      display: flex;
      min-height: 44px;
      align-items: center;
      gap: 10px;
      color: var(--txt);
      font-size: 1.375rem;
      text-decoration: none;
    }
    .logo img {
      width: 34px;
      height: 34px;
    }
    .mes {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.07);
      border-radius: 999px;
    }
    .mes > span {
      min-width: 150px;
      text-align: center;
    }
    .mes button,
    .ib {
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      color: var(--txt);
      background: rgba(255, 255, 255, 0.07);
      border: 0;
      border-radius: 50%;
      cursor: pointer;
      text-decoration: none;
      transition:
        background-color 160ms ease,
        transform 160ms ease;
    }
    .mes button:hover:not(:disabled),
    .ib:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.18);
    }
    .ib:active {
      transform: scale(0.94);
    }
    button:disabled {
      opacity: 0.45;
      cursor: default;
    }
    .herr {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .actualizado {
      margin-right: 4px;
      color: var(--suave);
      font-size: 0.8125rem;
    }
    .ib.texto {
      width: auto;
      gap: 6px;
      padding: 0 16px 0 12px;
      border-radius: 999px;
      display: inline-flex;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .nuevo {
      height: 44px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 20px 0 14px;
      color: #10200a;
      font: inherit;
      font-weight: 700;
      background: var(--acento);
      border: 0;
      border-radius: 999px;
      cursor: pointer;
      transition:
        transform 160ms ease,
        box-shadow 160ms ease;
    }
    .nuevo:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(198, 255, 61, 0.3);
    }

    /* ---- Cuadrícula ---- */
    .contenido {
      max-width: 1320px;
      margin: 0 auto;
      padding: 24px 24px 64px;
    }
    .bento {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 16px;
      transition: opacity 300ms ease;
    }
    .bento.refrescando {
      opacity: 0.6;
    }
    .tile {
      position: relative;
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-width: 0;
      color: var(--txt);
      text-decoration: none;
      background: var(--tile);
      backdrop-filter: blur(14px) saturate(1.2);
      border: 1px solid var(--borde);
      border-radius: 26px;
      animation: subir 640ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
      animation-delay: calc(var(--i, 0) * 70ms);
      transition:
        transform 220ms ease,
        border-color 220ms ease;
    }
    .tile:hover {
      transform: translateY(-3px);
      border-color: rgba(255, 255, 255, 0.24);
    }
    @keyframes subir {
      from {
        opacity: 0;
        transform: translateY(22px) scale(0.985);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
    .hero {
      grid-column: span 8;
      grid-row: span 2;
    }
    .ahorro,
    .bolsas {
      grid-column: span 4;
    }
    .kp {
      grid-column: span 4;
    }
    .calor {
      grid-column: span 5;
    }
    .cats {
      grid-column: span 7;
    }
    .seis {
      grid-column: span 7;
    }
    .rec {
      grid-column: span 5;
    }
    .meta,
    .avisos {
      grid-column: span 6;
    }
    .t-tit {
      color: var(--suave);
      font-size: 0.9375rem;
      font-weight: 600;
    }
    .cab-t {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .nota,
    .vacio {
      color: var(--suave);
      font-size: 0.875rem;
    }
    .vacio {
      padding: 12px 0;
    }
    .num {
      font-variant-numeric: tabular-nums;
    }
    .pos {
      color: var(--acento);
    }

    /* ---- Hero ---- */
    .hero-cab {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .saludo {
      font-size: 1.25rem;
      font-weight: 600;
    }
    .hallazgo {
      max-width: 440px;
      margin-top: 2px;
      color: var(--suave);
      font-size: 0.9375rem;
    }
    .etiqueta {
      padding: 6px 12px;
      color: var(--suave);
      font-size: 0.8125rem;
      background: rgba(255, 255, 255, 0.07);
      border-radius: 999px;
    }
    .cifra {
      font-size: clamp(2.75rem, 7vw, 4.75rem);
      font-weight: 700;
      line-height: 1;
      letter-spacing: -0.035em;
      font-variant-numeric: tabular-nums;
    }
    .chip-d {
      align-self: flex-start;
      padding: 3px 10px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--acento);
      background: rgba(198, 255, 61, 0.14);
      border-radius: 999px;
    }
    .chip-d.mal {
      color: var(--coral);
      background: rgba(255, 122, 92, 0.16);
    }
    .chip-d.neutro {
      color: var(--suave);
      background: rgba(255, 255, 255, 0.08);
    }
    .hero app-area-chart {
      margin-top: auto;
    }

    /* ---- Anillo y bolsas ---- */
    .r-num {
      font-size: 2.25rem;
      font-weight: 700;
      line-height: 1;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }
    .r-num.chico {
      font-size: 1.125rem;
    }
    .r-sub {
      margin-top: 4px;
      color: var(--suave);
      font-size: 0.8125rem;
    }
    .pie {
      text-align: center;
      color: var(--suave);
      font-size: 0.875rem;
    }
    .bolsa .fila {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
      font-size: 0.9375rem;
    }
    .bolsa small {
      color: var(--suave);
    }
    .pista {
      height: 8px;
      background: rgba(255, 255, 255, 0.09);
      border-radius: 999px;
      overflow: hidden;
    }
    .rell {
      display: block;
      height: 100%;
      background: var(--aqua);
      border-radius: 999px;
      transition: width 1.1s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .rell.cerca {
      background: #f4d68f;
    }
    .rell.excedido {
      background: var(--coral);
    }

    /* ---- Indicadores ---- */
    .k-valor {
      font-size: clamp(1.75rem, 3vw, 2.25rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }
    .kp app-sparkline {
      margin-top: auto;
    }

    /* ---- Calendario de calor ---- */
    .leyenda {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--suave);
      font-size: 0.75rem;
    }
    .leyenda i {
      width: 12px;
      height: 12px;
      border-radius: 4px;
    }
    .l0 {
      background: rgba(255, 255, 255, 0.08);
    }
    .l1 {
      background: color-mix(in srgb, var(--calor) 28%, transparent);
    }
    .l2 {
      background: color-mix(in srgb, var(--calor) 48%, transparent);
    }
    .l3 {
      background: color-mix(in srgb, var(--calor) 70%, transparent);
    }
    .l4 {
      background: var(--calor);
    }

    /* ---- Control segmentado ---- */
    .seg {
      display: inline-flex;
      gap: 4px;
      padding: 4px;
      background: rgba(255, 255, 255, 0.07);
      border-radius: 999px;
    }
    .seg button {
      height: 40px;
      padding: 0 16px;
      color: var(--suave);
      font: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      background: none;
      border: 0;
      border-radius: 999px;
      cursor: pointer;
      transition:
        background-color 200ms ease,
        color 200ms ease;
    }
    .seg button[aria-pressed='true'] {
      color: #10200a;
      background: var(--acento);
    }

    /* ---- Recientes ---- */
    .rec ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .rec li {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
      animation: subir 520ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }
    .rec li:last-child {
      border-bottom: 0;
    }
    .av {
      flex: none;
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      color: var(--c);
      background: color-mix(in srgb, var(--c) 18%, transparent);
      border-radius: 12px;
    }
    .info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .info strong,
    .info small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .info small {
      color: var(--suave);
      font-size: 0.8125rem;
    }
    .monto {
      flex: none;
      font-weight: 700;
    }

    /* ---- Meta y avisos ---- */
    .meta {
      flex-direction: row;
      align-items: center;
      gap: 18px;
      overflow: hidden;
    }
    .portada {
      flex: none;
      align-self: stretch;
      width: 34%;
      margin: -22px 0 -22px -22px;
      background-size: cover;
      background-position: center;
    }
    .m-cuerpo {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .m-cuerpo strong {
      font-size: 1.375rem;
    }
    .m-anillo {
      flex: none;
      width: 96px;
    }
    .meta.vacia {
      flex-direction: column;
      justify-content: center;
      text-align: center;
    }
    .meta.vacia .material-symbols-outlined {
      font-size: 36px;
      color: var(--acento);
    }
    .aviso {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      color: var(--txt);
      font-size: 0.9375rem;
      text-decoration: none;
      background: rgba(255, 255, 255, 0.07);
      border-radius: 16px;
      transition: background-color 160ms ease;
    }
    .aviso:hover {
      background: rgba(255, 255, 255, 0.13);
    }
    .aviso.alerta {
      background: rgba(244, 214, 143, 0.16);
    }

    /* ---- Esqueletos de carga ---- */
    .esq {
      pointer-events: none;
    }
    .esq .e-linea,
    .esq .e-bloque {
      display: block;
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.13) 37%, rgba(255, 255, 255, 0.05) 63%);
      background-size: 400% 100%;
      border-radius: 10px;
      animation: brillo 1.4s ease infinite;
    }
    .esq .e-linea {
      height: 14px;
    }
    .esq .ancha {
      width: 55%;
    }
    .esq .corta {
      width: 30%;
    }
    .esq .e-bloque {
      margin-top: auto;
      border-radius: 18px;
    }
    @keyframes brillo {
      0% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0 50%;
      }
    }
    .falla {
      display: grid;
      justify-items: center;
      gap: 12px;
      padding: 80px 0;
    }

    /* ---- Pantallas medianas y celulares ---- */
    @media (max-width: 1100px) {
      .hero {
        grid-column: span 12;
        grid-row: auto;
      }
      .ahorro,
      .bolsas {
        grid-column: span 6;
      }
      .calor,
      .cats,
      .seis,
      .rec,
      .meta,
      .avisos {
        grid-column: span 12;
      }
    }
    @media (max-width: 760px) {
      .barra {
        padding: 10px 14px;
      }
      .contenido {
        padding: 16px 14px 48px;
      }
      .actualizado,
      .solo-ancho {
        display: none;
      }
      .ib.texto {
        width: 44px;
        padding: 0;
        justify-content: center;
      }
      .mes > span {
        min-width: 120px;
      }
      .ahorro,
      .bolsas,
      .kp {
        grid-column: span 12;
      }
      .portada {
        display: none;
      }
    }
  `,
})
export class Propuesta {
  private readonly txs = inject(TransactionsService);
  private readonly accounts = inject(AccountsService);
  private readonly categories = inject(CategoriesService);
  private readonly goals = inject(GoalsService);
  private readonly investments = inject(InvestmentsService);
  private readonly receivables = inject(ReceivablesService);
  private readonly budget = inject(BudgetService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly refresh = inject(RefreshService);

  protected readonly nombre = NOMBRE_USUARIO;
  protected readonly saludoTexto = saludo(horaBogota());
  protected readonly conImagen = FONDOS.filter((f) => f.img);
  protected readonly fondo = signal(leerFondo());
  protected readonly mes = signal(mesDe(hoy()));
  protected readonly cargando = signal(true);
  protected readonly fallo = signal(false);
  protected readonly vistaCat = signal<'barras' | 'dona'>('barras');
  protected readonly etiqueta = etiquetaBolsa;
  private readonly ahora = signal(Date.now());

  protected readonly esqueletos = [
    { c: 'hero', h: 230 },
    { c: 'ahorro', h: 150 },
    { c: 'bolsas', h: 110 },
    { c: 'kpi', h: 50 },
    { c: 'kpi', h: 50 },
    { c: 'kpi', h: 50 },
    { c: 'calor', h: 210 },
    { c: 'cats', h: 210 },
  ];

  protected readonly nombreFondo = computed(() => FONDOS.find((f) => f.id === this.fondo())?.nombre ?? '');
  protected readonly etiquetaMes = computed(() => cap(etiquetaMes(this.mes())));
  protected readonly esActual = computed(() => this.mes() >= mesDe(hoy()));
  protected readonly hace = computed(() => {
    const s = Math.max(0, Math.round((this.ahora() - this.refresh.ultima()) / 1000));
    if (s < 45) return 'Actualizado hace un momento';
    const m = Math.round(s / 60);
    return m < 60 ? `Actualizado hace ${m} min` : `Actualizado hace ${Math.round(m / 60)} h`;
  });

  // ---- Datos del mes ----
  protected readonly totales = computed(() => totalesDelMes(this.txs.light(), this.mes()));
  protected readonly gastosTexto = computed(() => cop(this.totales().gastos));
  private readonly meses6 = computed(() => Array.from({ length: 6 }, (_, i) => sumarMeses(this.mes(), i - 5)));
  protected readonly serie = computed(() => totalesPorMes(this.txs.light(), this.meses6()));

  private readonly nombreMesPrevio = computed(() => etiquetaMes(sumarMeses(this.mes(), -1)).split(' de ')[0]);

  private delta(actual: number, anterior: number, buenoSube: boolean): Delta {
    const mes = this.nombreMesPrevio();
    if (anterior === 0) return { texto: `Sin datos en ${mes}`, clase: 'neutro' };
    const dif = actual - anterior;
    if (dif === 0) return { texto: `Igual que en ${mes}`, clase: 'neutro' };
    return { texto: `${copConSigno(dif)} vs ${mes}`, clase: dif > 0 === buenoSube ? 'bien' : 'mal' };
  }

  protected readonly kpis = computed(() => {
    const t = this.totales();
    const s = this.serie();
    const prev = s[s.length - 2];
    return [
      { id: 'ing', titulo: 'Ingresos', valor: t.ingresos, color: '#c6ff3d', serie: s.map((x) => x.ingresos), delta: this.delta(t.ingresos, prev.ingresos, true) },
      { id: 'gas', titulo: 'Gastos', valor: t.gastos, color: '#ff7a5c', serie: s.map((x) => x.gastos), delta: this.delta(t.gastos, prev.gastos, false) },
      { id: 'net', titulo: 'Neto del mes', valor: t.neto, color: '#38d6c4', serie: s.map((x) => x.ingresos - x.gastos), delta: this.delta(t.neto, prev.ingresos - prev.gastos, true) },
    ];
  });

  private readonly saldosMapa = computed(() => saldosPorCuenta(this.txs.light()));
  protected readonly disponible = computed(() => this.accounts.activas().reduce((s, a) => s + (this.saldosMapa().get(a.id) ?? 0), 0));

  /** Patrimonio al cierre de cada uno de los últimos siete meses (ingresos menos gastos acumulados). */
  protected readonly patrimonio = computed<PuntoArea[]>(() => {
    const light = this.txs.light();
    return Array.from({ length: 7 }, (_, i) => sumarMeses(this.mes(), i - 6)).map((m) => {
      const hasta = rangoMes(m).hasta;
      let v = 0;
      for (const t of light) {
        if (t.occurred_on > hasta) continue;
        if (t.kind === 'income') v += t.amount;
        else if (t.kind === 'expense') v -= t.amount;
      }
      return { etiqueta: mesCorto(m), valor: v };
    });
  });

  protected readonly variacion = computed<Delta>(() => {
    const p = this.patrimonio();
    const d = p[p.length - 1].valor - p[p.length - 2].valor;
    const mes = this.nombreMesPrevio();
    if (d === 0) return { texto: `Sin cambios frente a ${mes}`, clase: 'neutro' };
    return { texto: `${copConSigno(d)} frente a ${mes}`, clase: d > 0 ? 'bien' : 'mal' };
  });

  protected readonly hallazgo = computed(() => {
    const t = totalesDelMes(this.txs.light(), mesDe(hoy()));
    if (t.ingresos === 0 && t.gastos === 0) return 'Aún no hay movimientos este mes.';
    if (t.ingresos > 0 && t.gastos > t.ingresos) return `Este mes los gastos superan a los ingresos por ${cop(t.gastos - t.ingresos)}.`;
    if (t.ingresos > 0) return `Este mes llevas ${cop(t.neto)} por encima de tus gastos.`;
    return `Este mes llevas ${cop(t.gastos)} en gastos y aún no registras ingresos.`;
  });

  protected readonly presupuesto = computed(() => {
    const bolsaPorCategoria = new Map(this.categories.items().map((c) => [c.id, c.bucket]));
    const light = this.txs.light();
    const mes = this.mes();
    const ingresos = light.filter((t) => t.kind === 'income' && mesDe(t.occurred_on) === mes).reduce((s, t) => s + t.amount, 0);
    return calcularPresupuesto(ingresos, gastoPorBolsa(light, bolsaPorCategoria, mes), reglasVigentes(this.budget.reglas(), mes).porcentajes);
  });
  protected readonly pctAhorro = computed(() => Math.max(0, Math.round(this.presupuesto().ahorro.ratio * 100)));

  protected readonly gastosPorDia = computed(() => {
    const por: Record<string, number> = {};
    for (const t of this.txs.light()) if (t.kind === 'expense' && mesDe(t.occurred_on) === this.mes()) por[t.occurred_on] = (por[t.occurred_on] ?? 0) + t.amount;
    return por;
  });

  protected readonly categorias = computed<ItemBarra[]>(() => {
    const cat = new Map(this.categories.items().map((c) => [c.id, c]));
    return gastosPorCategoria(this.txs.light(), this.mes())
      .slice(0, 7)
      .map((g, i) => ({ id: g.category_id, nombre: cat.get(g.category_id)?.name ?? 'Sin categoría', valor: g.total, color: PALETA[i % PALETA.length], icono: cat.get(g.category_id)?.icon ?? 'category' }));
  });

  protected readonly dona = computed<DatoDona[]>(() => {
    const todas = gastosPorCategoria(this.txs.light(), this.mes());
    const cat = new Map(this.categories.items().map((c) => [c.id, c.name]));
    const base = todas.slice(0, 5).map((g, i) => ({ etiqueta: cat.get(g.category_id) ?? 'Sin categoría', valor: g.total, color: PALETA[i % PALETA.length] }));
    const resto = todas.slice(5).reduce((s, g) => s + g.total, 0);
    return resto > 0 ? [...base, { etiqueta: 'Otras', valor: resto, color: '#64748b' }] : base;
  });

  protected readonly recientes = computed(() => {
    const cat = new Map(this.categories.items().map((c) => [c.id, c]));
    const cuentas = new Map(this.accounts.items().map((a) => [a.id, a.name]));
    return [...this.txs.light()]
      .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
      .slice(0, 6)
      .map((t) => {
        const c = t.category_id ? cat.get(t.category_id) : undefined;
        const transf = t.kind === 'transfer';
        return {
          id: t.id,
          kind: t.kind,
          titulo: transf ? `${cuentas.get(t.account_id) ?? '—'} → ${cuentas.get(t.to_account_id ?? '') ?? '—'}` : (c?.name ?? 'Sin categoría'),
          icono: transf ? 'swap_horiz' : (c?.icon ?? 'category'),
          color: transf ? COLOR_POR_DEFECTO : colorDe(c?.color ?? null) === COLOR_POR_DEFECTO ? PALETA[(c?.name.length ?? 0) % PALETA.length] : colorDe(c?.color ?? null),
          fecha: formatoFecha(t.occurred_on),
          cuenta: transf ? 'Transferencia' : (cuentas.get(t.account_id) ?? '—'),
          signo: t.kind === 'income' ? '+' : t.kind === 'expense' ? '-' : '',
          monto: t.amount,
        };
      });
  });

  protected readonly meta = computed(() => {
    const g = this.goals.goals().find((x) => !x.is_completed);
    if (!g) return null;
    const aportado = totalAportado(this.goals.aportes(), g.id);
    return {
      nombre: g.name,
      imagen: imagenDeMeta(g.name),
      aportado,
      objetivo: g.target_amount,
      pct: Math.min(100, Math.round(progresoMeta(aportado, g.target_amount) * 100)),
      mensual: ahorroMensualNecesario(aportado, g.target_amount, g.target_date),
    };
  });

  protected readonly avisos = computed(() => {
    const lista: { texto: string; ruta: string; icono: string; alerta: boolean }[] = [];
    for (const i of this.investments.items()) {
      if (!requiereAlerta(i.end_on, i.status)) continue;
      const d = diasAlVencimiento(i.end_on);
      lista.push({ texto: d < 0 ? `Tu ${i.product} en ${i.entity} ya venció: revisa la tasa antes de renovar.` : `Tu ${i.product} en ${i.entity} vence en ${d} ${d === 1 ? 'día' : 'días'}: revisa la tasa antes de renovar.`, ruta: '/mas/cdts', icono: 'event_upcoming', alerta: true });
    }
    const pendientes = this.receivables
      .cobros()
      .filter((c) => c.status === 'pending' || c.status === 'partial')
      .reduce((s, c) => s + saldoPendiente(c.amount, this.receivables.pagos().filter((p) => p.receivable_id === c.id)), 0);
    if (pendientes > 0) lista.push({ texto: `Te deben ${cop(pendientes)} en préstamos por cobrar.`, ruta: '/mas/prestamos', icono: 'handshake', alerta: false });
    return lista;
  });

  constructor() {
    void this.cargar();
    const reloj = setInterval(() => this.ahora.set(Date.now()), 20_000);
    inject(DestroyRef).onDestroy(() => clearInterval(reloj));
  }

  protected tope(ratio: number): number {
    return Math.max(0, Math.min(100, Math.round((Number.isFinite(ratio) ? ratio : 1) * 100)));
  }

  protected moverMes(n: number): void {
    this.mes.set(sumarMeses(this.mes(), n));
  }

  protected siguienteFondo(): void {
    const ids = FONDOS.map((f) => f.id) as string[];
    const siguiente = ids[(ids.indexOf(this.fondo()) + 1) % ids.length];
    this.fondo.set(siguiente);
    try {
      localStorage.setItem(CLAVE_FONDO, siguiente);
    } catch {
      /* sin almacenamiento: el fondo vale solo para esta sesión */
    }
  }

  protected async recargar(): Promise<void> {
    try {
      await this.refresh.recargar();
      this.snackBar.open('Datos actualizados.', undefined, { duration: 2200 });
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    }
  }

  protected async nuevo(): Promise<void> {
    const { TxDialog } = await import('../pages/movimientos/tx-dialog');
    this.dialog.open(TxDialog, { data: {}, width: '520px', maxWidth: 'calc(100vw - 24px)' });
  }

  protected async verCategoria(id: string): Promise<void> {
    const nombre = this.categories.items().find((c) => c.id === id)?.name ?? 'Categoría';
    const filas = (await this.txs.month(this.mes())).filter((t) => t.kind === 'expense' && t.category_id === id);
    this.abrirDetalle(nombre, `Gastos de ${this.etiquetaMes().toLowerCase()}`, filas);
  }

  protected async verDia(fecha: string): Promise<void> {
    const filas = (await this.txs.month(this.mes())).filter((t) => t.occurred_on === fecha);
    this.abrirDetalle(formatoFecha(fecha), filas.length ? `${filas.length} ${filas.length === 1 ? 'movimiento' : 'movimientos'}` : 'Sin movimientos este día', filas);
  }

  private abrirDetalle(titulo: string, subtitulo: string, filas: Tx[]): void {
    const cat = new Map(this.categories.items().map((c) => [c.id, c]));
    const cuentas = new Map(this.accounts.items().map((a) => [a.id, a.name]));
    const mapeadas: FilaDetalle[] = filas.map((t, i) => {
      const c = t.category_id ? cat.get(t.category_id) : undefined;
      const transf = t.kind === 'transfer';
      return {
        id: t.id,
        titulo: transf ? 'Transferencia' : (c?.name ?? 'Sin categoría'),
        detalle: [formatoFecha(t.occurred_on), t.description, transf ? `${cuentas.get(t.account_id) ?? ''} → ${cuentas.get(t.to_account_id ?? '') ?? ''}` : cuentas.get(t.account_id)].filter(Boolean).join(' · '),
        signo: t.kind === 'income' ? '+' : t.kind === 'expense' ? '-' : '',
        monto: t.amount,
        icono: transf ? 'swap_horiz' : (c?.icon ?? 'category'),
        color: PALETA[i % PALETA.length],
      };
    });
    const total = filas.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0);
    this.dialog.open(DetalleDialog, {
      data: { titulo, subtitulo, total, filas: mapeadas },
      panelClass: 'dialogo-selva',
      backdropClass: 'fondo-selva',
      width: '480px',
      maxWidth: 'calc(100vw - 24px)',
      autoFocus: 'dialog',
    });
  }

  protected async cargar(): Promise<void> {
    this.fallo.set(false);
    this.cargando.set(true);
    try {
      await Promise.all([
        this.txs.ensureLight(),
        this.accounts.load(),
        this.categories.load(),
        this.goals.load(),
        this.investments.load(),
        this.receivables.load(),
        this.budget.load(),
        // Un instante mínimo para que los esqueletos se vean y la entrada no sea un parpadeo.
        new Promise((r) => setTimeout(r, 600)),
      ]);
      this.refresh.ultima.set(Date.now());
    } catch (e) {
      this.fallo.set(true);
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.cargando.set(false);
    }
  }
}
