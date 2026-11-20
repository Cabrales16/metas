import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CopPipe } from '../../core/cop.pipe';
import { diasEntre, formatoFecha, hoy } from '../../core/dates';
import { ahorroMensualNecesario, imagenDeMeta, progresoMeta, totalAportado } from '../../core/goals';
import { Aporte, Goal, GoalsService } from '../../core/goals.service';
import { NetService } from '../../core/net.service';
import { ConfirmDialog, ConfirmData } from '../../shared/confirm-dialog';
import { AporteDialog, MetaDialog } from './meta-dialogs';

@Component({
  selector: 'app-metas',
  imports: [MatButtonModule, CopPipe],
  template: `
    <header class="page-header">
      <h1>Metas</h1>
      <button mat-flat-button type="button" (click)="abrirMeta()">
        <span class="material-symbols-outlined" matButtonIcon aria-hidden="true">add</span>
        Nueva meta
      </button>
    </header>

    @if (fallo()) {
      <div class="state">
        <p>No se pudieron cargar las metas.</p>
        <button mat-stroked-button type="button" (click)="cargar()">Reintentar</button>
      </div>
    } @else if (cargando()) {
      <div class="skel" style="height: 240px; border-radius: 16px" aria-busy="true"></div>
    } @else if (!vistas().length) {
      <div class="card empty">
        <span class="material-symbols-outlined" aria-hidden="true">flag</span>
        <strong>Todavía no tienes metas</strong>
        <p>Crea la primera, por ejemplo tu moto: ponle un valor y una fecha y te digo cuánto ahorrar al mes.</p>
        <button mat-flat-button type="button" (click)="abrirMeta()">Crear mi primera meta</button>
      </div>
    } @else {
      <div class="metas">
        @for (m of vistas(); track m.goal.id) {
          <article class="card meta" [class.lograda]="m.goal.is_completed">
            <div
              class="portada"
              [class.sin-imagen]="!m.imagen"
              [style.background-image]="m.imagen ? 'url(' + m.imagen + ')' : null"
            >
              @if (!m.imagen) {
                <span class="material-symbols-outlined" aria-hidden="true">flag</span>
              }
              @if (m.goal.is_completed) {
                <span class="chip ok">Lograda</span>
              }
            </div>
            <div class="cuerpo">
              <h2>{{ m.goal.name }}</h2>
              <div class="progress prim" role="progressbar" [attr.aria-valuenow]="m.pct" aria-valuemin="0" aria-valuemax="100" [attr.aria-label]="m.goal.name">
                <span [style.width.%]="m.pct"></span>
              </div>
              <p class="cifras num">
                <strong>{{ m.aportado | cop }}</strong>
                <span class="muted"> de {{ m.goal.target_amount | cop }} · {{ m.pct }} %</span>
              </p>
              @if (m.goal.target_date && !m.goal.is_completed) {
                <p class="muted">
                  Para el {{ fecha(m.goal.target_date) }} ({{ m.dias }}).
                  @if (m.mensual !== null && m.mensual > 0) {
                    Necesitas ahorrar <strong class="num">{{ m.mensual | cop }}</strong> al mes.
                  }
                </p>
              } @else if (!m.goal.is_completed) {
                <p class="muted">Sin fecha objetivo: ponle una para ver cuánto ahorrar al mes.</p>
              }

              <div class="acciones">
                @if (!m.goal.is_completed) {
                  <button mat-flat-button type="button" (click)="aportar(m.goal)">Aportar</button>
                }
                <button mat-button type="button" (click)="abrirMeta(m.goal)">Editar</button>
                <button mat-button type="button" (click)="alternarLograda(m.goal)" [disabled]="!net.online()">
                  {{ m.goal.is_completed ? 'Reabrir' : 'Marcar lograda' }}
                </button>
              </div>

              @if (m.aportes.length) {
                <details>
                  <summary>Historial ({{ m.aportes.length }})</summary>
                  <ul class="historial">
                    @for (a of m.aportes; track a.id) {
                      <li>
                        <span class="muted">{{ fecha(a.contributed_on) }}</span>
                        <span class="nota">{{ a.note }}</span>
                        <strong class="num" [class.pos]="a.amount > 0">{{ a.amount > 0 ? '+' : '-' }}{{ abs(a.amount) | cop }}</strong>
                        <button type="button" class="icon-btn" [attr.aria-label]="'Eliminar el movimiento del ' + fecha(a.contributed_on)" [disabled]="!net.online()" (click)="borrar(a)">
                          <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                        </button>
                      </li>
                    }
                  </ul>
                </details>
              }
            </div>
          </article>
        }
      </div>
    }
  `,
  styles: `
    .metas {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      align-items: start;
    }
    .meta {
      overflow: hidden;
    }
    .meta.lograda {
      opacity: 0.85;
    }
    .portada {
      position: relative;
      height: 160px;
      background-size: cover;
      background-position: center;
    }
    .portada.sin-imagen {
      display: grid;
      place-items: center;
      background: var(--prim-bg);
      color: var(--prim-text);
    }
    .portada .material-symbols-outlined {
      font-size: 44px;
    }
    .portada .chip {
      position: absolute;
      top: 12px;
      right: 12px;
    }
    .cuerpo {
      padding: 16px 20px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    h2 {
      font-size: 1.25rem;
      font-weight: 700;
    }
    .cifras strong {
      font-size: 1.25rem;
    }
    .acciones {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
      padding: 6px 0;
    }
    .historial {
      list-style: none;
      margin: 8px 0 0;
      padding: 0;
    }
    .historial li {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 2px 0;
    }
    .historial .nota {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.875rem;
      color: var(--muted);
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
    @media (max-width: 800px) {
      .metas {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class Metas {
  protected readonly goals = inject(GoalsService);
  protected readonly net = inject(NetService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly cargando = signal(true);
  protected readonly fallo = signal(false);
  protected readonly fecha = formatoFecha;
  protected readonly abs = Math.abs;

  protected readonly vistas = computed(() => {
    const aportes = this.goals.aportes();
    return [...this.goals.goals()]
      .sort((a, b) => Number(a.is_completed) - Number(b.is_completed))
      .map((goal) => {
        const aportado = totalAportado(aportes, goal.id);
        const d = goal.target_date ? diasEntre(hoy(), goal.target_date) : null;
        return {
          goal,
          aportado,
          imagen: imagenDeMeta(goal.name),
          pct: Math.min(100, Math.round(progresoMeta(aportado, goal.target_amount) * 100)),
          mensual: ahorroMensualNecesario(aportado, goal.target_amount, goal.target_date),
          dias: d === null ? '' : d < 0 ? 'fecha vencida' : d === 0 ? 'es hoy' : `faltan ${d} días`,
          aportes: aportes.filter((a) => a.goal_id === goal.id),
        };
      });
  });

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.fallo.set(false);
    this.cargando.set(true);
    try {
      await this.goals.load();
    } catch (e) {
      this.fallo.set(true);
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.cargando.set(false);
    }
  }

  protected abrirMeta(meta?: Goal): void {
    this.dialog.open(MetaDialog, { data: { meta }, width: '440px', maxWidth: 'calc(100vw - 24px)' });
  }

  protected aportar(meta: Goal): void {
    this.dialog.open(AporteDialog, { data: { meta }, width: '440px', maxWidth: 'calc(100vw - 24px)' });
  }

  protected async alternarLograda(meta: Goal): Promise<void> {
    try {
      await this.goals.updateGoal(meta.id, { is_completed: !meta.is_completed });
    } catch (e) {
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    }
  }

  protected borrar(aporte: Aporte): void {
    const ref = this.dialog.open<ConfirmDialog, ConfirmData, boolean>(ConfirmDialog, {
      data: {
        titulo: 'Eliminar registro',
        mensaje: 'Se quitará este aporte o retiro del historial de la meta. No se puede deshacer.',
        confirmar: 'Eliminar',
      },
    });
    ref.afterClosed().subscribe(async (ok) => {
      if (!ok) return;
      try {
        await this.goals.removeAporte(aporte.id);
      } catch (e) {
        this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
      }
    });
  }
}
