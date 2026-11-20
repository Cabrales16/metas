import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

import { AccountsService } from '../../core/accounts.service';
import { TxKind, gastoPorBolsa, gastosPorCategoria, saldosPorCuenta, totalesDelMes, totalesPorMes } from '../../core/aggregates';
import { calcularPresupuesto, reglasVigentes } from '../../core/budget';
import { BudgetService } from '../../core/budget.service';
import { diasAlVencimiento, requiereAlerta } from '../../core/cdt';
import { COLORES, COLOR_POR_DEFECTO, colorDe, etiquetaBolsa } from '../../core/catalog';
import { CategoriesService } from '../../core/categories.service';
import { CopPipe } from '../../core/cop.pipe';
import { etiquetaMes, formatoFecha, hoy, horaBogota, mesDe, sumarMeses } from '../../core/dates';
import { cop, copConSigno, porcentaje } from '../../core/format';
import { ahorroMensualNecesario, imagenDeMeta, progresoMeta, totalAportado } from '../../core/goals';
import { GoalsService } from '../../core/goals.service';
import { InvestmentsService } from '../../core/investments.service';
import { NOMBRE_USUARIO, saludo } from '../../core/profile';
import { saldoPendiente } from '../../core/receivables';
import { ReceivablesService } from '../../core/receivables.service';
import { TransactionsService } from '../../core/transactions.service';
import { Bars } from '../../shared/bars';
import { Donut, DatoDona } from '../../shared/donut';
import { MonthNav } from '../../shared/month-nav';
import { abrirMovimiento } from '../../shared/tx-launcher';

interface Delta {
  texto: string;
  clase: '' | 'pos' | 'neg';
}

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, MatButtonModule, CopPipe, MonthNav, Donut, Bars],
  template: `
    <section class="hero" style="background-image: url(img/banner-bogota.jpg)">
      <div class="scrim">
        <div class="texto">
          <h1>{{ saludoTexto }}, {{ nombre }}</h1>
          <p class="hallazgo">{{ hallazgo() }}</p>
          <div class="rapidas" role="group" aria-label="Registrar un movimiento">
            <button type="button" class="r principal" (click)="registrar('expense')">
              <span class="material-symbols-outlined" aria-hidden="true">remove</span>Gasto
            </button>
            <button type="button" class="r" (click)="registrar('income')">
              <span class="material-symbols-outlined" aria-hidden="true">add</span>Ingreso
            </button>
            <button type="button" class="r" (click)="registrar('transfer')">
              <span class="material-symbols-outlined" aria-hidden="true">swap_horiz</span>Transferencia
            </button>
          </div>
        </div>
        <div class="figura">
          <span class="et">Disponible en tus cuentas</span>
          <span class="grande num">{{ disponible() | cop }}</span>
          @if (saldos().length) {
            <span class="chips">
              @for (s of saldos(); track s.id) {
                <span class="chip-s"><i [style.background]="s.color"></i>{{ s.nombre }} <b class="num">{{ s.saldo | cop }}</b></span>
              }
            </span>
          }
        </div>
      </div>
    </section>

    @if (fallo()) {
      <div class="state">
        <p>No se pudieron cargar tus datos.</p>
        <button mat-stroked-button type="button" (click)="cargar()">Reintentar</button>
      </div>
    } @else if (cargando()) {
      <div class="stack" aria-busy="true">
        <div class="skel" style="height: 90px; border-radius: 16px"></div>
        <div class="skel" style="height: 260px; border-radius: 16px"></div>
      </div>
    } @else {
      @if (pasos(); as p) {
        @if (p.hechos < p.total) {
          <section class="card pasos">
            <div class="card-head">
              <h2>Primeros pasos</h2>
              <span class="muted">{{ p.hechos }} de {{ p.total }}</span>
            </div>
            <div class="card-body">
              <div class="progress prim" role="progressbar" [attr.aria-valuenow]="p.pct" aria-valuemin="0" aria-valuemax="100" aria-label="Primeros pasos">
                <span [style.width.%]="p.pct"></span>
              </div>
              <ul>
                @for (s of p.lista; track s.ruta) {
                  <li>
                    <a [routerLink]="s.ruta" [class.hecho]="s.hecho">
                      <span class="check material-symbols-outlined" aria-hidden="true">{{ s.hecho ? 'check_circle' : 'radio_button_unchecked' }}</span>
                      <span class="paso">{{ s.texto }}</span>
                      <span class="material-symbols-outlined ir" aria-hidden="true">chevron_right</span>
                    </a>
                  </li>
                }
              </ul>
            </div>
          </section>
        }
      }

      @if (avisos().length) {
        <section class="card avisos-card">
      <div class="card-head"><h2>Para estar al tanto</h2></div>
      <div class="card-body avisos">
        @for (a of avisos(); track a.texto) {
          <a [routerLink]="a.ruta" class="aviso" [class.alerta]="a.alerta">
            <span class="material-symbols-outlined" aria-hidden="true">{{ a.icono }}</span>
            <span>{{ a.texto }}</span>
          </a>
        } @empty {
          <p class="muted">Nada pendiente por ahora.</p>
        }
      </div>
    </section>
      }

      <div class="barra">
        <h2>Resumen del mes</h2>
        <app-month-nav [(mes)]="mes" />
      </div>

      <section class="kpis" aria-label="Resumen del mes">
        <div class="card kpi k-ing">
          <span class="label">Ingresos</span>
          <span class="value pos">{{ totales().ingresos | cop }}</span>
          <span class="note" [class]="deltas().ingresos.clase">{{ deltas().ingresos.texto }}</span>
        </div>
        <div class="card kpi k-gas">
          <span class="label">Gastos</span>
          <span class="value">{{ totales().gastos | cop }}</span>
          <span class="note" [class]="deltas().gastos.clase">{{ deltas().gastos.texto }}</span>
        </div>
        <div class="card kpi k-net">
          <span class="label">Neto del mes</span>
          <span class="value" [class.neg]="totales().neto < 0">{{ totales().neto | cop }}</span>
          <span class="note" [class]="deltas().neto.clase">{{ totales().ingresos > 0 ? pctAhorro() + ' de tus ingresos · ' : '' }}{{ deltas().neto.texto }}</span>
        </div>
      </section>

      <div class="grid-2 bloque">
        <section class="card">
          <div class="card-head"><h2>Gastos por categoría</h2></div>
          <div class="card-body">
            @if (dona().length) {
              <app-donut [datos]="dona()" [centro]="gastosTexto()" subcentro="en gastos" />
            } @else {
              <div class="empty">
                <span class="material-symbols-outlined" aria-hidden="true">donut_small</span>
                <strong>Sin gastos este mes</strong>
                <p>Cuando registres gastos, verás aquí en qué se va tu plata.</p>
              </div>
            }
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h2>Presupuesto del mes</h2>
            <a class="enlace" routerLink="/presupuesto">Ver detalle</a>
          </div>
          <div class="card-body presu">
            @if (presupuesto().base === 0) {
              <p class="muted">Se calcula sobre los ingresos del mes y aún no hay ingresos.</p>
            }
            @for (b of presupuesto().bolsas; track b.bucket) {
              <div class="bolsa">
                <div class="fila-top">
                  <span>{{ etiqueta(b.bucket) }} <small class="muted">{{ b.percent }} %</small></span>
                  <span class="num muted">{{ b.gastado | cop }} de {{ b.asignado | cop }}</span>
                </div>
                <div class="progress" [class.warn]="presupuesto().base > 0 && b.estado === 'cerca'" [class.err]="presupuesto().base > 0 && b.estado === 'excedido'" role="progressbar" [attr.aria-valuenow]="tope(b.ratio)" aria-valuemin="0" aria-valuemax="100" [attr.aria-label]="etiqueta(b.bucket)">
                  <span [style.width.%]="presupuesto().base > 0 ? tope(b.ratio) : 0"></span>
                </div>
              </div>
            }
            <div class="ahorro-fila">
              <span class="muted">Ahorro real</span>
              <strong class="num" [class.neg]="presupuesto().ahorro.real < 0">{{ presupuesto().ahorro.real | cop }}</strong>
              <span class="muted num">de {{ presupuesto().ahorro.meta | cop }}</span>
            </div>
          </div>
        </section>
      </div>

      <div class="grid-2 bloque">
        <section class="card">
          <div class="card-head">
            <h2>Últimos movimientos</h2>
            <a class="enlace" routerLink="/movimientos">Ver todos</a>
          </div>
          <div class="card-body recientes">
            @for (r of recientes(); track r.id) {
              <div class="reciente">
                <span class="av" [style.--c]="r.color"><span class="material-symbols-outlined" aria-hidden="true">{{ r.icono }}</span></span>
                <div class="info">
                  <strong>{{ r.titulo }}</strong>
                  <span class="muted">{{ r.fecha }} · {{ r.cuenta }}</span>
                </div>
                <span class="num monto" [class.pos]="r.kind === 'income'">{{ r.signo }}{{ r.monto | cop }}</span>
              </div>
            } @empty {
              <div class="empty">
                <span class="material-symbols-outlined" aria-hidden="true">receipt_long</span>
                <strong>Aún no hay movimientos</strong>
                <p>Registra el primero con los botones del banner o importa tu historial de Monefy.</p>
              </div>
            }
          </div>
        </section>

        <div class="stack">
        <section class="card">
          <div class="card-head">
            <h2>Saldo por cuenta</h2>
            <a class="enlace" routerLink="/mas/cuentas">Cuentas</a>
          </div>
          <div class="card-body">
            @if (saldos().length) {
              <ul class="saldos">
                @for (s of saldos(); track s.id) {
                  <li>
                    <span class="nombre-cuenta"><i [style.background]="s.color"></i>{{ s.nombre }}</span>
                    <strong class="num" [class.neg]="s.saldo < 0">{{ s.saldo | cop }}</strong>
                  </li>
                }
              </ul>
            } @else {
              <p class="muted">Aún no tienes cuentas activas.</p>
            }
          </div>
        </section>

        @if (metaPrincipal(); as m) {
          <a class="card meta" routerLink="/metas">
            @if (m.imagen) {
              <div class="portada" [style.background-image]="'url(' + m.imagen + ')'"></div>
            }
            <div class="meta-cuerpo">
              <span class="muted">Tu meta principal</span>
              <strong>{{ m.nombre }}</strong>
              <div class="progress prim" role="progressbar" [attr.aria-valuenow]="m.pct" aria-valuemin="0" aria-valuemax="100">
                <span [style.width.%]="m.pct"></span>
              </div>
              <span class="muted num">{{ m.aportado | cop }} de {{ m.objetivo | cop }} · {{ m.pct }} %</span>
              @if (m.mensual !== null && m.mensual > 0) {
                <span class="muted">Para llegar a tiempo: {{ m.mensual | cop }} al mes.</span>
              }
            </div>
          </a>
        } @else {
          <a class="card meta vacia" routerLink="/metas">
            <span class="material-symbols-outlined" aria-hidden="true">flag</span>
            <strong>Crea tu primera meta</strong>
            <span class="muted">Por ejemplo, la moto: ponle valor y fecha y la seguimos juntos.</span>
          </a>
        }
        </div>
      </div>

      <section class="card bloque">
        <div class="card-head"><h2>Últimos seis meses</h2></div>
        <div class="card-body"><app-bars [datos]="seisMeses()" /></div>
      </section>


    }
  `,
  styles: `
    .hero {
      margin-bottom: 20px;
      background-size: cover;
      background-position: center 40%;
      border-radius: 20px;
      overflow: hidden;
    }
    .scrim {
      min-height: 230px;
      padding: 28px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
      color: #fff;
      background: linear-gradient(to top, rgba(15, 14, 13, 0.86), rgba(15, 14, 13, 0.28) 72%);
    }
    .texto h1 {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.015em;
    }
    .hallazgo {
      max-width: 460px;
      margin-top: 6px;
      font-size: 1rem;
      opacity: 0.95;
    }
    .rapidas {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }
    .r {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 40px;
      padding: 0 16px 0 12px;
      color: #fff;
      font: inherit;
      font-size: 0.9375rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.16);
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 999px;
      cursor: pointer;
      transition:
        background-color 160ms ease,
        transform 160ms ease;
    }
    .r:hover {
      background: rgba(255, 255, 255, 0.28);
      transform: translateY(-1px);
    }
    .r.principal {
      color: var(--on-prim);
      background: var(--prim);
      border-color: var(--prim);
    }
    .r.principal:hover {
      background: var(--prim-h);
    }
    .r .material-symbols-outlined {
      font-size: 20px;
    }
    .figura {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      text-align: right;
    }
    .et {
      font-size: 0.875rem;
      opacity: 0.9;
    }
    .grande {
      font-size: 2.5rem;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.015em;
      color: var(--prim);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 6px;
      margin-top: 8px;
    }
    .chip-s {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      font-size: 0.8125rem;
      background: rgba(255, 255, 255, 0.14);
      border-radius: 999px;
    }
    .chip-s i,
    .nombre-cuenta i {
      flex: none;
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .barra {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 14px;
    }
    .barra h2 {
      font-size: 1.125rem;
      font-weight: 700;
    }
    .bloque {
      margin-top: 16px;
    }
    .enlace {
      color: var(--prim-text);
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
    }
    .enlace:hover {
      text-decoration: underline;
    }
    .pasos,
    .avisos-card {
      margin-bottom: 20px;
    }
    .pasos ul {
      list-style: none;
      margin: 12px 0 0;
      padding: 0;
    }
    .pasos a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 4px;
      color: var(--ink);
      text-decoration: none;
      border-top: 1px solid var(--line-2);
    }
    .pasos li:first-child a {
      border-top: 0;
    }
    .pasos a:hover .ir {
      transform: translateX(3px);
    }
    .pasos .check {
      color: var(--faint);
    }
    .pasos a.hecho .check {
      color: var(--ok);
    }
    .pasos a.hecho .paso {
      color: var(--muted);
      text-decoration: line-through;
    }
    .pasos .paso {
      flex: 1;
    }
    .pasos .ir {
      color: var(--faint);
      transition: transform 160ms ease;
    }
    .k-ing {
      box-shadow: inset 0 3px 0 var(--ok), var(--shadow);
    }
    .k-gas {
      box-shadow: inset 0 3px 0 var(--prim), var(--shadow);
    }
    .k-net {
      box-shadow: inset 0 3px 0 var(--ink), var(--shadow);
    }
    .note.pos {
      color: var(--ok);
    }
    .note.neg {
      color: var(--err);
    }
    .presu {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .fila-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
      font-size: 0.9375rem;
    }
    .ahorro-fila {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
      padding-top: 12px;
      border-top: 1px solid var(--line-2);
    }
    .ahorro-fila strong {
      font-size: 1.125rem;
    }
    .recientes {
      display: flex;
      flex-direction: column;
    }
    .reciente {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-top: 1px solid var(--line-2);
    }
    .reciente:first-child {
      border-top: 0;
      padding-top: 0;
    }
    .av {
      flex: none;
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      color: var(--c, var(--muted));
      background: color-mix(in srgb, var(--c, #64748b) 16%, transparent);
      border-radius: 12px;
    }
    .reciente .info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .reciente .info strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }
    .monto {
      flex: none;
      font-weight: 700;
    }
    .saldos {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
    }
    .saldos li {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--line-2);
    }
    .saldos li:last-child {
      border-bottom: 0;
    }
    .nombre-cuenta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .meta {
      display: flex;
      overflow: hidden;
      color: inherit;
      text-decoration: none;
    }
    .portada {
      flex: none;
      width: 38%;
      background-size: cover;
      background-position: center;
    }
    .meta-cuerpo {
      flex: 1;
      min-width: 0;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .meta-cuerpo strong {
      font-size: 1.125rem;
    }
    .meta.vacia {
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 28px 20px;
      text-align: center;
    }
    .meta.vacia .material-symbols-outlined {
      font-size: 36px;
      color: var(--prim-text);
    }
    .avisos {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .aviso {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      color: var(--ink);
      font-size: 0.9375rem;
      text-decoration: none;
      background: var(--line-2);
      border-radius: 12px;
    }
    .aviso.alerta {
      background: var(--warn-bg);
    }
    .aviso .material-symbols-outlined {
      flex: none;
      font-size: 22px;
    }
    @media (max-width: 600px) {
      .scrim {
        padding: 20px;
        min-height: 210px;
      }
      .texto h1 {
        font-size: 1.5rem;
      }
      .figura {
        align-items: flex-start;
        text-align: left;
      }
      .chips {
        justify-content: flex-start;
      }
      .grande {
        font-size: 2rem;
      }
      .meta {
        flex-direction: column;
      }
      .portada {
        width: 100%;
        height: 130px;
      }
    }
  `,
})
export class Inicio {
  private readonly txs = inject(TransactionsService);
  private readonly accounts = inject(AccountsService);
  private readonly categories = inject(CategoriesService);
  private readonly goals = inject(GoalsService);
  private readonly investments = inject(InvestmentsService);
  private readonly receivables = inject(ReceivablesService);
  private readonly budget = inject(BudgetService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly nombre = NOMBRE_USUARIO;
  protected readonly saludoTexto = saludo(horaBogota());
  protected readonly mes = signal(mesDe(hoy()));
  protected readonly cargando = signal(true);
  protected readonly fallo = signal(false);
  protected readonly etiqueta = etiquetaBolsa;

  protected readonly totales = computed(() => totalesDelMes(this.txs.light(), this.mes()));
  protected readonly gastosTexto = computed(() => cop(this.totales().gastos));
  protected readonly pctAhorro = computed(() => {
    const t = this.totales();
    return t.ingresos > 0 ? porcentaje(Math.max(0, t.neto) / t.ingresos, 0) : '';
  });

  /** Comparación con el mes anterior: el color dice si el cambio es bueno o malo, no si sube o baja. */
  protected readonly deltas = computed(() => {
    const t = this.totales();
    const previo = totalesDelMes(this.txs.light(), sumarMeses(this.mes(), -1));
    const nombreMes = etiquetaMes(sumarMeses(this.mes(), -1)).split(' de ')[0];
    const delta = (actual: number, anterior: number, buenoSube: boolean): Delta => {
      if (anterior === 0) return { texto: `Sin datos en ${nombreMes}`, clase: '' };
      const dif = actual - anterior;
      if (dif === 0) return { texto: `Igual que en ${nombreMes}`, clase: '' };
      return { texto: `${copConSigno(dif)} frente a ${nombreMes}`, clase: dif > 0 === buenoSube ? 'pos' : 'neg' };
    };
    return {
      ingresos: delta(t.ingresos, previo.ingresos, true),
      gastos: delta(t.gastos, previo.gastos, false),
      neto: delta(t.neto, previo.neto, true),
    };
  });

  private readonly saldosMapa = computed(() => saldosPorCuenta(this.txs.light()));
  protected readonly saldos = computed(() =>
    this.accounts.activas().map((a) => ({
      id: a.id,
      nombre: a.name,
      color: colorDe(a.color),
      saldo: this.saldosMapa().get(a.id) ?? 0,
    })),
  );
  protected readonly disponible = computed(() => this.saldos().reduce((s, x) => s + x.saldo, 0));

  protected readonly presupuesto = computed(() => {
    const bolsaPorCategoria = new Map(this.categories.items().map((c) => [c.id, c.bucket]));
    const light = this.txs.light();
    const mes = this.mes();
    const ingresos = light.filter((t) => t.kind === 'income' && mesDe(t.occurred_on) === mes).reduce((s, t) => s + t.amount, 0);
    const { porcentajes } = reglasVigentes(this.budget.reglas(), mes);
    return calcularPresupuesto(ingresos, gastoPorBolsa(light, bolsaPorCategoria, mes), porcentajes);
  });

  protected readonly dona = computed<DatoDona[]>(() => {
    const porId = new Map(this.categories.items().map((c) => [c.id, c]));
    const filas = gastosPorCategoria(this.txs.light(), this.mes()).map((g, i) => {
      const c = porId.get(g.category_id);
      return {
        etiqueta: c?.name ?? 'Sin categoría',
        valor: g.total,
        color: c?.color ? colorDe(c.color) : COLORES[i % COLORES.length].hex,
      };
    });
    if (filas.length <= 6) return filas;
    const otras = filas.slice(5).reduce((s, f) => s + f.valor, 0);
    return [...filas.slice(0, 5), { etiqueta: 'Otras', valor: otras, color: '#64748b' }];
  });

  protected readonly seisMeses = computed(() => {
    const meses = Array.from({ length: 6 }, (_, i) => sumarMeses(this.mes(), i - 5));
    return totalesPorMes(this.txs.light(), meses);
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
          color: transf ? COLOR_POR_DEFECTO : colorDe(c?.color ?? null),
          fecha: formatoFecha(t.occurred_on),
          cuenta: transf ? 'Transferencia' : (cuentas.get(t.account_id) ?? '—'),
          signo: t.kind === 'income' ? '+' : t.kind === 'expense' ? '-' : '',
          monto: t.amount,
        };
      });
  });

  protected readonly hallazgo = computed(() => {
    const t = totalesDelMes(this.txs.light(), mesDe(hoy()));
    if (this.cargando()) return 'Cargando tus números…';
    if (t.ingresos === 0 && t.gastos === 0) return 'Aún no hay movimientos este mes.';
    if (t.ingresos > 0 && t.gastos > t.ingresos) return `Este mes los gastos superan a los ingresos por ${cop(t.gastos - t.ingresos)}.`;
    if (t.ingresos > 0) return `Este mes llevas ${cop(t.neto)} por encima de tus gastos.`;
    return `Este mes llevas ${cop(t.gastos)} en gastos y aún no registras ingresos.`;
  });

  /** Guía para una cuenta nueva: se oculta sola cuando todo está hecho. */
  protected readonly pasos = computed(() => {
    const lista = [
      { texto: 'Registra o importa tus movimientos', ruta: '/mas/importar', hecho: this.txs.light().length > 0 },
      { texto: 'Crea tu primera meta de ahorro', ruta: '/metas', hecho: this.goals.goals().length > 0 },
      { texto: 'Anota tus CDTs para ver el interés mes a mes', ruta: '/mas/cdts', hecho: this.investments.items().length > 0 },
      { texto: 'Registra lo que te deben', ruta: '/mas/prestamos', hecho: this.receivables.cobros().length > 0 },
    ];
    const hechos = lista.filter((p) => p.hecho).length;
    return { lista, hechos, total: lista.length, pct: Math.round((hechos / lista.length) * 100) };
  });

  protected readonly metaPrincipal = computed(() => {
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
      lista.push({
        texto:
          d < 0
            ? `Tu ${i.product} en ${i.entity} ya venció: revisa la tasa antes de renovar.`
            : `Tu ${i.product} en ${i.entity} vence en ${d} ${d === 1 ? 'día' : 'días'}: revisa la tasa antes de renovar.`,
        ruta: '/mas/cdts',
        icono: 'event_upcoming',
        alerta: true,
      });
    }
    const pendientes = this.receivables
      .cobros()
      .filter((c) => c.status === 'pending' || c.status === 'partial')
      .reduce((s, c) => s + saldoPendiente(c.amount, this.receivables.pagos().filter((p) => p.receivable_id === c.id)), 0);
    if (pendientes > 0) {
      lista.push({ texto: `Te deben ${cop(pendientes)} en préstamos por cobrar.`, ruta: '/mas/prestamos', icono: 'handshake', alerta: false });
    }
    return lista;
  });

  constructor() {
    void this.cargar();
  }

  protected tope(ratio: number): number {
    return Math.max(0, Math.min(100, Math.round((Number.isFinite(ratio) ? ratio : 1) * 100)));
  }

  protected registrar(kind: TxKind): Promise<void> {
    return abrirMovimiento(this.dialog, kind);
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
      ]);
    } catch (e) {
      this.fallo.set(true);
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.cargando.set(false);
    }
  }
}
