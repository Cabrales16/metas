import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

import { AccountsService } from '../../core/accounts.service';
import { gastosPorCategoria, saldosPorCuenta, totalesDelMes, totalesPorMes } from '../../core/aggregates';
import { COLORES, colorDe } from '../../core/catalog';
import { CategoriesService } from '../../core/categories.service';
import { CopPipe } from '../../core/cop.pipe';
import { cop, porcentaje } from '../../core/format';
import { diasAlVencimiento, requiereAlerta } from '../../core/cdt';
import { etiquetaMes, hoy, horaBogota, mesDe, sumarMeses } from '../../core/dates';
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

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, MatButtonModule, CopPipe, MonthNav, Donut, Bars],
  template: `
    <section class="hero" style="background-image: url(img/banner-bogota.jpg)">
      <div class="scrim">
        <div class="texto">
          <h1>{{ saludoTexto }}, {{ nombre }}</h1>
          <p class="hallazgo">{{ hallazgo() }}</p>
        </div>
        <div class="figura">
          <span class="et">Disponible en tus cuentas</span>
          <span class="grande num">{{ disponible() | cop }}</span>
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
      <div class="barra">
        <h2>Resumen del mes</h2>
        <app-month-nav [(mes)]="mes" />
      </div>

      <section class="kpis" aria-label="Resumen del mes">
        <div class="card kpi">
          <span class="label">Ingresos</span>
          <span class="value pos">{{ totales().ingresos | cop }}</span>
        </div>
        <div class="card kpi">
          <span class="label">Gastos</span>
          <span class="value">{{ totales().gastos | cop }}</span>
        </div>
        <div class="card kpi">
          <span class="label">Neto del mes</span>
          <span class="value" [class.neg]="totales().neto < 0">{{ totales().neto | cop }}</span>
          @if (totales().ingresos > 0) {
            <span class="note">{{ pctAhorro() }} de tus ingresos</span>
          }
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
            <h2>Saldo por cuenta</h2>
            <a class="enlace" routerLink="/mas/cuentas">Cuentas</a>
          </div>
          <div class="card-body">
            @if (saldos().length) {
              <ul class="saldos">
                @for (s of saldos(); track s.id) {
                  <li>
                    <span>{{ s.nombre }}</span>
                    <strong class="num" [class.neg]="s.saldo < 0">{{ s.saldo | cop }}</strong>
                  </li>
                }
              </ul>
            } @else {
              <p class="muted">Aún no tienes cuentas activas.</p>
            }
          </div>
        </section>
      </div>

      <section class="card bloque">
        <div class="card-head"><h2>Últimos seis meses</h2></div>
        <div class="card-body"><app-bars [datos]="seisMeses()" /></div>
      </section>

      <div class="grid-2 bloque">
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

        <section class="card">
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
      </div>
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
      min-height: 190px;
      padding: 28px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
      color: #fff;
      background: linear-gradient(to top, rgba(15, 14, 13, 0.82), rgba(15, 14, 13, 0.25) 70%);
    }
    .texto h1 {
      font-size: 1.875rem;
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.01em;
    }
    .hallazgo {
      max-width: 460px;
      margin-top: 6px;
      font-size: 1rem;
      opacity: 0.95;
    }
    .figura {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      text-align: right;
    }
    .et {
      font-size: 0.875rem;
      opacity: 0.9;
    }
    .grande {
      font-size: 2.25rem;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.01em;
      color: var(--prim);
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
        min-height: 170px;
      }
      .texto h1 {
        font-size: 1.5rem;
      }
      .figura {
        align-items: flex-start;
        text-align: left;
      }
      .grande {
        font-size: 1.875rem;
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
  private readonly snackBar = inject(MatSnackBar);

  protected readonly nombre = NOMBRE_USUARIO;
  protected readonly saludoTexto = saludo(horaBogota());
  protected readonly mes = signal(mesDe(hoy()));
  protected readonly cargando = signal(true);
  protected readonly fallo = signal(false);

  protected readonly totales = computed(() => totalesDelMes(this.txs.light(), this.mes()));
  protected readonly gastosTexto = computed(() => cop(this.totales().gastos));
  protected readonly pctAhorro = computed(() => {
    const t = this.totales();
    return t.ingresos > 0 ? porcentaje(Math.max(0, t.neto) / t.ingresos, 0) : '';
  });

  private readonly saldosMapa = computed(() => saldosPorCuenta(this.txs.light()));
  protected readonly saldos = computed(() =>
    this.accounts
      .activas()
      .map((a) => ({ id: a.id, nombre: a.name, saldo: this.saldosMapa().get(a.id) ?? 0 })),
  );
  protected readonly disponible = computed(() => this.saldos().reduce((s, x) => s + x.saldo, 0));

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

  protected readonly hallazgo = computed(() => {
    const t = totalesDelMes(this.txs.light(), mesDe(hoy()));
    if (this.cargando()) return 'Cargando tus números…';
    if (t.ingresos === 0 && t.gastos === 0) return 'Aún no hay movimientos este mes.';
    if (t.ingresos > 0 && t.gastos > t.ingresos) return `Este mes los gastos superan a los ingresos por ${cop(t.gastos - t.ingresos)}.`;
    if (t.ingresos > 0) return `Este mes llevas ${cop(t.neto)} por encima de tus gastos.`;
    return `Este mes llevas ${cop(t.gastos)} en gastos y aún no registras ingresos.`;
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
      .reduce(
        (s, c) => s + saldoPendiente(c.amount, this.receivables.pagos().filter((p) => p.receivable_id === c.id)),
        0,
      );
    if (pendientes > 0) {
      lista.push({ texto: `Te deben ${cop(pendientes)} en préstamos por cobrar.`, ruta: '/mas/prestamos', icono: 'handshake', alerta: false });
    }
    return lista;
  });

  constructor() {
    void this.cargar();
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
      ]);
    } catch (e) {
      this.fallo.set(true);
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.cargando.set(false);
    }
  }
}
