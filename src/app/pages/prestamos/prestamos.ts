import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

import { CopPipe } from '../../core/cop.pipe';
import { formatoFecha, hoy } from '../../core/dates';
import { NetService } from '../../core/net.service';
import { estadoSegunPagos, saldoPendiente, totalPagado } from '../../core/receivables';
import { Cobro, PagoCobro, ReceivablesService } from '../../core/receivables.service';
import { ConfirmDialog, ConfirmData } from '../../shared/confirm-dialog';
import { PagoDialog, PrestamoDialog } from './prestamo-dialogs';

const ESTADOS = { pending: 'Pendiente', partial: 'Pago parcial', paid: 'Pagado', written_off: 'Dado de baja' } as const;

@Component({
  selector: 'app-prestamos',
  imports: [RouterLink, MatButtonModule, CopPipe],
  template: `
    <header class="page-header">
      <a class="back" routerLink="/mas" aria-label="Volver a Más">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
      </a>
      <h1>Por cobrar</h1>
      <button mat-flat-button type="button" (click)="abrir()">
        <span class="material-symbols-outlined" matButtonIcon aria-hidden="true">add</span>
        Nuevo préstamo
      </button>
      <p class="sub">Lo que prestaste y cuánto te falta por recibir.</p>
    </header>

    @if (fallo()) {
      <div class="state">
        <p>No se pudieron cargar los préstamos.</p>
        <button mat-stroked-button type="button" (click)="cargar()">Reintentar</button>
      </div>
    } @else if (cargando()) {
      <div class="skel" style="height: 200px; border-radius: 16px" aria-busy="true"></div>
    } @else if (!vistas().length) {
      <div class="card empty">
        <span class="material-symbols-outlined" aria-hidden="true">handshake</span>
        <strong>No tienes préstamos registrados</strong>
        <p>Cuando prestes plata, regístralo aquí y ve anotando los pagos parciales.</p>
        <button mat-flat-button type="button" (click)="abrir()">Registrar un préstamo</button>
      </div>
    } @else {
      <section class="kpis" aria-label="Resumen">
        <div class="card kpi">
          <span class="label">Te deben</span>
          <span class="value">{{ resumen().porCobrar | cop }}</span>
        </div>
        <div class="card kpi">
          <span class="label">Préstamos activos</span>
          <span class="value">{{ resumen().activos }}</span>
        </div>
        <div class="card kpi">
          <span class="label">Ya recuperaste</span>
          <span class="value pos">{{ resumen().recuperado | cop }}</span>
        </div>
      </section>

      <div class="seg filtro" role="group" aria-label="Ver">
        <button type="button" [attr.aria-pressed]="!verTodos()" (click)="verTodos.set(false)">Activos</button>
        <button type="button" [attr.aria-pressed]="verTodos()" (click)="verTodos.set(true)">Todos</button>
      </div>

      <div class="lista">
        @for (v of visibles(); track v.cobro.id) {
          <article class="card prestamo">
            <div class="card-head">
              <h2>{{ v.cobro.person }}</h2>
              <span class="chip" [class.ok]="v.cobro.status === 'paid'" [class.warn]="v.cobro.status === 'partial'" [class.err]="v.vencido">
                {{ v.vencido ? 'Vencido' : estado(v.cobro) }}
              </span>
            </div>
            <div class="card-body">
              <div class="progress" [class.prim]="v.cobro.status !== 'paid'" role="progressbar" [attr.aria-valuenow]="v.pct" aria-valuemin="0" aria-valuemax="100" [attr.aria-label]="'Pagado por ' + v.cobro.person">
                <span [style.width.%]="v.pct"></span>
              </div>
              <div class="fila"><span class="muted">Prestado el {{ fecha(v.cobro.lent_on) }}</span><span class="num">{{ v.cobro.amount | cop }}</span></div>
              <div class="fila"><span class="muted">Pagado</span><span class="num pos">{{ v.pagado | cop }}</span></div>
              <div class="fila"><span class="muted">Saldo pendiente</span><strong class="num">{{ v.saldo | cop }}</strong></div>
              @if (v.cobro.due_on) {
                <div class="fila"><span class="muted">Fecha límite</span><span>{{ fecha(v.cobro.due_on) }}</span></div>
              }
              @if (v.cobro.notes) {
                <p class="muted notas">{{ v.cobro.notes }}</p>
              }

              <div class="acciones">
                @if (v.saldo > 0 && v.cobro.status !== 'written_off') {
                  <button mat-flat-button type="button" (click)="pagar(v.cobro)">Registrar pago</button>
                }
                <button mat-button type="button" (click)="abrir(v.cobro)">Editar</button>
                @if (v.cobro.status === 'written_off') {
                  <button mat-button type="button" [disabled]="!net.online()" (click)="reabrir(v.cobro, v.pagado)">Reabrir</button>
                } @else if (v.cobro.status !== 'paid') {
                  <button mat-button type="button" [disabled]="!net.online()" (click)="darDeBaja(v.cobro)">Dar de baja</button>
                }
              </div>

              @if (v.pagos.length) {
                <details>
                  <summary>Pagos ({{ v.pagos.length }})</summary>
                  <ul class="pagos">
                    @for (p of v.pagos; track p.id) {
                      <li>
                        <span class="muted">{{ fecha(p.paid_on) }}</span>
                        <strong class="num pos">+{{ p.amount | cop }}</strong>
                        <button type="button" class="icon-btn" [attr.aria-label]="'Eliminar el pago del ' + fecha(p.paid_on)" [disabled]="!net.online()" (click)="borrarPago(p)">
                          <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                        </button>
                      </li>
                    }
                  </ul>
                </details>
              }
            </div>
          </article>
        } @empty {
          <p class="muted">No hay préstamos activos. Cambia a «Todos» para ver los anteriores.</p>
        }
      </div>
    }
  `,
  styles: `
    .kpis {
      margin-bottom: 16px;
    }
    .filtro {
      margin-bottom: 16px;
    }
    .lista {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      align-items: start;
    }
    .prestamo .progress {
      margin-bottom: 12px;
    }
    .fila {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 3px 0;
    }
    .notas {
      margin-top: 6px;
    }
    .acciones {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
      padding: 8px 0 4px;
    }
    .pagos {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .pagos li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .icon-btn {
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      color: var(--muted);
      background: transparent;
      border: 0;
      border-radius: 50%;
      cursor: pointer;
    }
    .icon-btn:hover:not(:disabled) {
      color: var(--ink);
      background: var(--line-2);
    }
    @media (max-width: 900px) {
      .lista {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class Prestamos {
  private readonly receivables = inject(ReceivablesService);
  protected readonly net = inject(NetService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly cargando = signal(true);
  protected readonly fallo = signal(false);
  protected readonly verTodos = signal(false);
  protected readonly fecha = formatoFecha;

  protected readonly vistas = computed(() => {
    const pagosTodos = this.receivables.pagos();
    return this.receivables.cobros().map((cobro) => {
      const pagos = pagosTodos.filter((p) => p.receivable_id === cobro.id);
      const pagado = totalPagado(pagos);
      const saldo = saldoPendiente(cobro.amount, pagos);
      return {
        cobro,
        pagos,
        pagado,
        saldo,
        pct: Math.min(100, Math.round((pagado / cobro.amount) * 100)),
        activo: cobro.status === 'pending' || cobro.status === 'partial',
        vencido: (cobro.status === 'pending' || cobro.status === 'partial') && !!cobro.due_on && cobro.due_on < hoy(),
      };
    });
  });

  protected readonly visibles = computed(() => this.vistas().filter((v) => this.verTodos() || v.activo));

  protected readonly resumen = computed(() => {
    const activos = this.vistas().filter((v) => v.activo);
    return {
      porCobrar: activos.reduce((s, v) => s + v.saldo, 0),
      activos: activos.length,
      recuperado: this.vistas().reduce((s, v) => s + v.pagado, 0),
    };
  });

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.fallo.set(false);
    this.cargando.set(true);
    try {
      await this.receivables.load();
    } catch (e) {
      this.fallo.set(true);
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.cargando.set(false);
    }
  }

  protected estado = (c: Cobro) => ESTADOS[c.status];

  protected abrir(cobro?: Cobro): void {
    this.dialog.open(PrestamoDialog, { data: { cobro }, width: '460px', maxWidth: 'calc(100vw - 24px)' });
  }

  protected pagar(cobro: Cobro): void {
    this.dialog.open(PagoDialog, { data: { cobro }, width: '420px', maxWidth: 'calc(100vw - 24px)' });
  }

  protected async reabrir(cobro: Cobro, pagado: number): Promise<void> {
    try {
      await this.receivables.update(cobro.id, { status: estadoSegunPagos('pending', cobro.amount, pagado) });
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    }
  }

  protected darDeBaja(cobro: Cobro): void {
    this.confirmar('Dar de baja el préstamo', `Marcarás el préstamo a ${cobro.person} como incobrable. Podrás reabrirlo después.`, 'Dar de baja', async () => {
      await this.receivables.update(cobro.id, { status: 'written_off' });
    });
  }

  protected borrarPago(pago: PagoCobro): void {
    this.confirmar('Eliminar pago', 'Se quitará este pago y se recalculará el saldo. No se puede deshacer.', 'Eliminar', async () => {
      await this.receivables.removePago(pago);
    });
  }

  private confirmar(titulo: string, mensaje: string, confirmar: string, accion: () => Promise<void>): void {
    const ref = this.dialog.open<ConfirmDialog, ConfirmData, boolean>(ConfirmDialog, { data: { titulo, mensaje, confirmar } });
    ref.afterClosed().subscribe(async (ok) => {
      if (!ok) return;
      try {
        await accion();
      } catch (e) {
        this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
      }
    });
  }
}
