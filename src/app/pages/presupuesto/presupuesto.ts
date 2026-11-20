import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { gastoPorBolsa } from '../../core/aggregates';
import { calcularPresupuesto, EstadoBolsa, reglasVigentes } from '../../core/budget';
import { BudgetService } from '../../core/budget.service';
import { BOLSAS, Bucket, etiquetaBolsa } from '../../core/catalog';
import { CategoriesService } from '../../core/categories.service';
import { CopPipe } from '../../core/cop.pipe';
import { etiquetaMes, hoy, mesDe } from '../../core/dates';
import { cop } from '../../core/format';
import { TransactionsService } from '../../core/transactions.service';
import { MonthNav } from '../../shared/month-nav';
import { ReglasDialog, ReglasDialogData } from './reglas-dialog';

const TEXTO_ESTADO: Record<EstadoBolsa, string> = {
  ok: 'En orden',
  cerca: 'Cerca del límite',
  excedido: 'Excedido',
};
const CLASE_ESTADO: Record<EstadoBolsa, string> = { ok: '', cerca: 'warn', excedido: 'err' };

import { PageHero } from '../../shared/page-hero';

@Component({
  selector: 'app-presupuesto',
  imports: [PageHero, MatButtonModule, CopPipe, MonthNav],
  template: `
    <app-page-hero titulo="Presupuesto" [subtitulo]="'Se calcula sobre los ingresos de ' + mesTexto() + ': ' + resumenReglas()" imagen="img/login-nevado.jpg" posicion="center 35%" />
    <div class="barra-mes"><app-month-nav [(mes)]="mes" /></div>

    @if (fallo()) {
      <div class="state">
        <p>No se pudo cargar el presupuesto.</p>
        <button mat-stroked-button type="button" (click)="cargar()">Reintentar</button>
      </div>
    } @else if (cargando()) {
      <div class="skel" style="height: 280px; border-radius: 16px" aria-busy="true"></div>
    } @else {
      @if (vigentes().esFallback) {
        <p class="aviso-regla" role="note">
          <span class="material-symbols-outlined" aria-hidden="true">info</span>
          {{ mesTitulo() }} es anterior a tu primera regla: se usan los porcentajes más antiguos.
        </p>
      }

      <section class="card ahorro">
        <div class="card-head">
          <h2>Ahorro del mes</h2>
          <span class="chip" [class.ok]="p().ahorro.real >= p().ahorro.meta && p().base > 0" [class.warn]="p().ahorro.real < p().ahorro.meta && p().base > 0">
            Meta {{ p().ahorro.metaPercent }} %
          </span>
        </div>
        <div class="card-body">
          <div class="cifras">
            <div>
              <span class="muted">Ahorro real</span>
              <strong class="grande num" [class.neg]="p().ahorro.real < 0">{{ p().ahorro.real | cop }}</strong>
            </div>
            <div>
              <span class="muted">Meta del mes</span>
              <strong class="mediana num">{{ p().ahorro.meta | cop }}</strong>
            </div>
          </div>
          <div class="progress" [class.prim]="true" role="progressbar" [attr.aria-valuenow]="pctAhorro()" aria-valuemin="0" aria-valuemax="100">
            <span [style.width.%]="pctAhorro()"></span>
          </div>
          <p class="muted">
            {{
              p().base === 0
                ? 'Aún no hay ingresos este mes: el presupuesto se calcula sobre los ingresos del mes.'
                : 'Ingresos del mes (' + cop(p().base) + ') menos los gastos de fijos, gustos y regalos.'
            }}
          </p>
        </div>
      </section>

      <div class="bolsas">
        @for (b of p().bolsas; track b.bucket) {
          <section class="card bolsa">
            <div class="card-head">
              <h2>{{ etiqueta(b.bucket) }} <span class="muted">{{ b.percent }} %</span></h2>
              <span class="chip" [class.ok]="b.estado === 'ok'" [class.warn]="b.estado === 'cerca'" [class.err]="b.estado === 'excedido'">
                {{ textoEstado[b.estado] }}
              </span>
            </div>
            <div class="card-body">
              <div class="progress" [class]="'progress ' + claseEstado[b.estado]" role="progressbar" [attr.aria-valuenow]="tope(b.ratio)" aria-valuemin="0" aria-valuemax="100" [attr.aria-label]="etiqueta(b.bucket)">
                <span [style.width.%]="tope(b.ratio)"></span>
              </div>
              <div class="fila">
                <span class="muted">Gastado</span>
                <strong class="num">{{ b.gastado | cop }}</strong>
              </div>
              <div class="fila">
                <span class="muted">Asignado</span>
                <span class="num">{{ b.asignado | cop }}</span>
              </div>
              <div class="fila">
                <span class="muted">{{ b.restante >= 0 ? 'Te quedan' : 'Te pasaste por' }}</span>
                <strong class="num" [class.neg]="b.restante < 0">{{ (b.restante >= 0 ? b.restante : -b.restante) | cop }}</strong>
              </div>
            </div>
          </section>
        }
      </div>

      <div class="acciones">
        <button mat-stroked-button type="button" (click)="editar()">
          <span class="material-symbols-outlined" matButtonIcon aria-hidden="true">tune</span>
          Editar porcentajes
        </button>
      </div>
    }
  `,
  styles: `
    .aviso-regla {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 16px;
      padding: 12px 14px;
      font-size: 0.9375rem;
      background: var(--warn-bg);
      border-radius: 12px;
    }
    .ahorro .cifras {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 48px;
      margin-bottom: 14px;
    }
    .cifras > div {
      display: flex;
      flex-direction: column;
    }
    .grande {
      font-size: 2rem;
      line-height: 1.15;
    }
    .mediana {
      font-size: 1.375rem;
      line-height: 1.5;
    }
    .ahorro .progress {
      height: 12px;
      margin-bottom: 10px;
    }
    .bolsas {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .bolsa .progress {
      margin-bottom: 12px;
    }
    .fila {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 4px 0;
    }
    .acciones {
      margin-top: 20px;
    }
    @media (max-width: 900px) {
      .bolsas {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class Presupuesto {
  private readonly txs = inject(TransactionsService);
  private readonly categories = inject(CategoriesService);
  private readonly budget = inject(BudgetService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly mes = signal(mesDe(hoy()));
  protected readonly cargando = signal(true);
  protected readonly fallo = signal(false);
  protected readonly textoEstado = TEXTO_ESTADO;
  protected readonly claseEstado = CLASE_ESTADO;
  protected readonly cop = cop;
  protected readonly etiqueta = (b: Bucket) => etiquetaBolsa(b);

  protected readonly mesTexto = computed(() => etiquetaMes(this.mes()));
  protected readonly mesTitulo = computed(() => this.mesTexto().charAt(0).toUpperCase() + this.mesTexto().slice(1));
  protected readonly vigentes = computed(() => reglasVigentes(this.budget.reglas(), this.mes()));
  protected readonly resumenReglas = computed(() => {
    const p = this.vigentes().porcentajes;
    return BOLSAS.map((b) => `${b.etiqueta} ${p[b.valor]} %`).join(' · ') + '.';
  });

  protected readonly p = computed(() => {
    const bolsaPorCategoria = new Map(this.categories.items().map((c) => [c.id, c.bucket]));
    const light = this.txs.light();
    const mes = this.mes();
    const ingresos = light
      .filter((t) => t.kind === 'income' && mesDe(t.occurred_on) === mes)
      .reduce((s, t) => s + t.amount, 0);
    return calcularPresupuesto(ingresos, gastoPorBolsa(light, bolsaPorCategoria, mes), this.vigentes().porcentajes);
  });

  protected readonly pctAhorro = computed(() => this.tope(this.p().ahorro.ratio));

  constructor() {
    void this.cargar();
  }

  protected tope(ratio: number): number {
    return Math.max(0, Math.min(100, Math.round((Number.isFinite(ratio) ? ratio : 1) * 100)));
  }

  protected async cargar(): Promise<void> {
    this.fallo.set(false);
    this.cargando.set(true);
    try {
      await Promise.all([this.txs.ensureLight(), this.categories.load(), this.budget.load()]);
    } catch (e) {
      this.fallo.set(true);
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.cargando.set(false);
    }
  }

  protected editar(): void {
    this.dialog.open<ReglasDialog, ReglasDialogData, boolean>(ReglasDialog, {
      data: { porcentajes: reglasVigentes(this.budget.reglas(), mesDe(hoy())).porcentajes, desde: mesDe(hoy()) },
      width: '420px',
      maxWidth: 'calc(100vw - 24px)',
    });
  }
}
