import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

import { diasAlVencimiento, PERIODICIDADES, proyectarCdt, requiereAlerta } from '../../core/cdt';
import { CopPipe } from '../../core/cop.pipe';
import { formatoFecha } from '../../core/dates';
import { porcentaje } from '../../core/format';
import { Investment, InvestmentsService } from '../../core/investments.service';
import { CdtDialog } from './cdt-dialog';

const ESTADOS = { active: 'Activo', matured: 'Vencido', cancelled: 'Cancelado' } as const;

@Component({
  selector: 'app-cdts',
  imports: [RouterLink, MatButtonModule, CopPipe],
  template: `
    <header class="page-header">
      <a class="back" routerLink="/mas" aria-label="Volver a Más">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
      </a>
      <h1>CDTs</h1>
      <button mat-flat-button type="button" (click)="abrir()">
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
        Nuevo CDT
      </button>
      <p class="sub">Tus inversiones a término, con el interés neto mes a mes.</p>
    </header>

    @if (fallo()) {
      <div class="state">
        <p>No se pudieron cargar los CDTs.</p>
        <button mat-stroked-button type="button" (click)="cargar()">Reintentar</button>
      </div>
    } @else if (cargando()) {
      <div class="skel" style="height: 220px; border-radius: 16px" aria-busy="true"></div>
    } @else if (!vistas().length) {
      <div class="card empty">
        <span class="material-symbols-outlined" aria-hidden="true">account_balance</span>
        <strong>Aún no registras CDTs</strong>
        <p>Agrega el primero con su tasa y fechas, y verás el interés neto mes a mes y los avisos de vencimiento.</p>
        <button mat-flat-button type="button" (click)="abrir()">Registrar un CDT</button>
      </div>
    } @else {
      <section class="kpis" aria-label="Resumen">
        <div class="card kpi">
          <span class="label">Invertido en CDTs activos</span>
          <span class="value">{{ resumen().invertido | cop }}</span>
        </div>
        <div class="card kpi">
          <span class="label">Interés neto al mes</span>
          <span class="value pos">{{ resumen().netoMensual | cop }}</span>
          <span class="note">Equivalente, descontando la retención</span>
        </div>
        <div class="card kpi">
          <span class="label">Próximo vencimiento</span>
          <span class="value">{{ resumen().proximo }}</span>
        </div>
      </section>

      <div class="lista">
        @for (v of vistas(); track v.inv.id) {
          <article class="card cdt" [class.inactivo]="v.inv.status !== 'active'">
            <div class="card-head">
              <h2>{{ v.inv.entity }} <span class="muted">{{ v.inv.product }}</span></h2>
              <span class="chip" [class.warn]="v.alerta" [class.ok]="v.inv.status === 'active' && !v.alerta">{{ estado(v.inv) }}</span>
            </div>
            <div class="card-body">
              @if (v.alerta) {
                <p class="alerta" role="alert">
                  <span class="material-symbols-outlined" aria-hidden="true">event_upcoming</span>
                  {{ v.dias < 0 ? 'Ya venció' : 'Vence en ' + v.dias + (v.dias === 1 ? ' día' : ' días') }}: revisa la tasa antes de renovar.
                </p>
              }
              <dl>
                <div><dt>Capital</dt><dd class="num">{{ v.inv.principal | cop }}</dd></div>
                <div><dt>Tasa E.A.</dt><dd class="num">{{ tasa(v.inv) }}</dd></div>
                <div><dt>Intereses</dt><dd>{{ periodicidad(v.inv) }}</dd></div>
                <div><dt>Vigencia</dt><dd>{{ fecha(v.inv.start_on) }} – {{ fecha(v.inv.end_on) }}</dd></div>
                <div><dt>Neto por periodo</dt><dd class="num pos">{{ v.p.netoPorPeriodo | cop }}</dd></div>
                <div><dt>Neto total proyectado</dt><dd class="num pos">{{ v.p.netoTotal | cop }}</dd></div>
                <div><dt>Bruto por periodo</dt><dd class="num">{{ v.p.brutoPorPeriodo | cop }}</dd></div>
                <div><dt>Retención</dt><dd class="num">{{ ret(v.inv) }}</dd></div>
              </dl>
              @if (v.inv.notes) {
                <p class="muted">{{ v.inv.notes }}</p>
              }
              <button mat-button type="button" (click)="abrir(v.inv)">Editar</button>
            </div>
          </article>
        }
      </div>
    }
  `,
  styles: `
    .kpis {
      margin-bottom: 16px;
    }
    .lista {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      align-items: start;
    }
    .cdt.inactivo {
      opacity: 0.7;
    }
    .alerta {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      padding: 10px 12px;
      font-weight: 500;
      background: var(--warn-bg);
      border-radius: 12px;
    }
    dl {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 16px;
      margin: 0 0 8px;
    }
    dt {
      color: var(--muted);
      font-size: 0.8125rem;
    }
    dd {
      margin: 0;
      font-weight: 600;
    }
    h2 .muted {
      font-weight: 400;
    }
    @media (max-width: 900px) {
      .lista {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class Cdts {
  private readonly investments = inject(InvestmentsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly cargando = signal(true);
  protected readonly fallo = signal(false);
  protected readonly fecha = formatoFecha;

  protected readonly vistas = computed(() =>
    this.investments
      .items()
      .map((inv) => ({
        inv,
        p: proyectarCdt(inv),
        dias: diasAlVencimiento(inv.end_on),
        alerta: requiereAlerta(inv.end_on, inv.status),
      }))
      .sort((a, b) => Number(b.inv.status === 'active') - Number(a.inv.status === 'active') || a.inv.end_on.localeCompare(b.inv.end_on)),
  );

  protected readonly resumen = computed(() => {
    const activos = this.vistas().filter((v) => v.inv.status === 'active');
    const proximo = activos[0];
    return {
      invertido: activos.reduce((s, v) => s + v.inv.principal, 0),
      netoMensual: activos.reduce((s, v) => s + v.p.netoMensualEquivalente, 0),
      proximo: proximo ? this.fecha(proximo.inv.end_on) : '—',
    };
  });

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.fallo.set(false);
    this.cargando.set(true);
    try {
      await this.investments.load();
    } catch (e) {
      this.fallo.set(true);
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.cargando.set(false);
    }
  }

  protected estado = (i: Investment) => ESTADOS[i.status];
  protected tasa = (i: Investment) => porcentaje(Number(i.rate_ea));
  protected ret = (i: Investment) => porcentaje(Number(i.withholding_rate), 1);
  protected periodicidad = (i: Investment) => PERIODICIDADES.find((p) => p.valor === i.payout_frequency)?.etiqueta ?? '';

  protected abrir(inv?: Investment): void {
    this.dialog.open(CdtDialog, { data: { inv }, width: '560px', maxWidth: 'calc(100vw - 24px)' });
  }
}
