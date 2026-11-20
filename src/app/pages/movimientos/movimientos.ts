import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AccountsService } from '../../core/accounts.service';
import { TxKind } from '../../core/aggregates';
import { COLOR_POR_DEFECTO, Category, colorDe } from '../../core/catalog';
import { CategoriesService } from '../../core/categories.service';
import { CopPipe } from '../../core/cop.pipe';
import { formatoDia, hoy, mesDe } from '../../core/dates';
import { copConSigno } from '../../core/format';
import { NetService } from '../../core/net.service';
import { Tx, TransactionsService } from '../../core/transactions.service';
import { ConfirmDialog, ConfirmData } from '../../shared/confirm-dialog';
import { MonthNav } from '../../shared/month-nav';
import { TxDialog, TxDialogData } from './tx-dialog';

interface Dia {
  fecha: string;
  titulo: string;
  neto: number;
  items: Tx[];
}

@Component({
  selector: 'app-movimientos',
  imports: [MatButtonModule, MatFormFieldModule, MatSelectModule, MonthNav, CopPipe],
  template: `
    <header class="page-header">
      <h1>Movimientos</h1>
      <app-month-nav [(mes)]="mes" />
    </header>

    <section class="kpis resumen" aria-label="Resumen del mes">
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
      </div>
    </section>

    <section class="filtros" aria-label="Filtros">
      <div class="seg" role="group" aria-label="Tipo">
        @for (t of tipos; track t.valor) {
          <button type="button" [attr.aria-pressed]="tipo() === t.valor" (click)="tipo.set(t.valor)">
            {{ t.etiqueta }}
          </button>
        }
      </div>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Cuenta</mat-label>
        <mat-select [value]="cuenta()" (selectionChange)="cuenta.set($event.value)">
          <mat-option value="">Todas</mat-option>
          @for (a of accounts.items(); track a.id) {
            <mat-option [value]="a.id">{{ a.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Categoría</mat-label>
        <mat-select [value]="categoria()" (selectionChange)="categoria.set($event.value)">
          <mat-option value="">Todas</mat-option>
          @for (c of categories.items(); track c.id) {
            <mat-option [value]="c.id">{{ c.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </section>

    @if (fallo()) {
      <div class="state">
        <p>No se pudieron cargar los movimientos.</p>
        <button mat-stroked-button type="button" (click)="cargar(true)">Reintentar</button>
      </div>
    } @else if (cargando()) {
      <div class="list" aria-busy="true">
        @for (n of [1, 2, 3, 4]; track n) {
          <div class="skel" style="height: 64px; border-radius: 16px"></div>
        }
      </div>
    } @else if (!dias().length) {
      <div class="card empty">
        <span class="material-symbols-outlined" aria-hidden="true">receipt_long</span>
        <strong>{{ filas().length ? 'Nada coincide con los filtros' : 'Sin movimientos este mes' }}</strong>
        <p>
          {{
            filas().length
              ? 'Cambia o quita algún filtro para ver más.'
              : 'Registra un gasto o un ingreso con el botón «Nuevo movimiento».'
          }}
        </p>
      </div>
    } @else {
      @for (d of dias(); track d.fecha) {
        <div class="dia-cab">
          <h2 class="group-title">{{ d.titulo }}</h2>
          <span class="muted num">{{ conSigno(d.neto) }}</span>
        </div>
        <ul class="list">
          @for (t of d.items; track t.id) {
            <li
              class="list-row tocable"
              tabindex="0"
              role="button"
              [attr.aria-label]="'Editar ' + titulo(t)"
              (click)="editar(t)"
              (keydown.enter)="editar(t)"
            >
              <span class="avatar" [style.--c]="colorFila(t)">
                <span class="material-symbols-outlined" aria-hidden="true">{{ iconoFila(t) }}</span>
              </span>
              <div class="info">
                <strong>{{ titulo(t) }}</strong>
                <span class="muted">{{ subtitulo(t) }}</span>
              </div>
              <span
                class="amount"
                [class.pos]="t.kind === 'income'"
                [attr.aria-label]="etiquetaTipo(t) + ' ' + t.amount"
              >
                {{ t.kind === 'income' ? '+' : t.kind === 'expense' ? '-' : '' }}{{ t.amount | cop }}
              </span>
              <button
                type="button"
                class="icon-btn acciones-fila"
                [attr.aria-label]="'Editar ' + titulo(t)"
                (click)="$event.stopPropagation(); editar(t)"
              >
                <span class="material-symbols-outlined" aria-hidden="true">edit</span>
              </button>
              <button
                type="button"
                class="icon-btn acciones-fila"
                [attr.aria-label]="'Eliminar ' + titulo(t)"
                [disabled]="!net.online()"
                (click)="$event.stopPropagation(); eliminar(t)"
              >
                <span class="material-symbols-outlined" aria-hidden="true">delete</span>
              </button>
            </li>
          }
        </ul>
      }
    }
  `,
  styles: `
    .resumen {
      margin-bottom: 16px;
    }
    .filtros {
      display: grid;
      grid-template-columns: auto 1fr 1fr;
      gap: 12px;
      align-items: center;
    }
    .dia-cab {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-top: 8px;
    }
    .dia-cab .group-title {
      display: block;
      text-transform: none;
      font-size: 0.9375rem;
      letter-spacing: 0;
    }
    .dia-cab .group-title::first-letter {
      text-transform: uppercase;
    }
    .tocable {
      cursor: pointer;
    }
    .tocable:hover {
      background: var(--surface-2);
    }
    .tocable:focus-visible {
      outline: 2px solid var(--prim-text);
    }
    @media (max-width: 640px) {
      /* En celular se toca la fila para editar; eliminar está dentro del formulario. */
      .acciones-fila {
        display: none !important;
      }
      .list-row.tocable {
        padding-right: 14px;
      }
    }
    @media (max-width: 760px) {
      .filtros {
        grid-template-columns: 1fr 1fr;
      }
      .filtros .seg {
        grid-column: 1 / -1;
        display: flex;
      }
      .filtros .seg button {
        flex: 1;
        padding: 0 6px;
      }
    }
  `,
})
export class Movimientos {
  protected readonly txs = inject(TransactionsService);
  protected readonly accounts = inject(AccountsService);
  protected readonly categories = inject(CategoriesService);
  protected readonly net = inject(NetService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly mes = signal(mesDe(hoy()));
  protected readonly tipo = signal<'all' | TxKind>('all');
  protected readonly cuenta = signal('');
  protected readonly categoria = signal('');

  protected readonly filas = signal<Tx[]>([]);
  protected readonly cargando = signal(true);
  protected readonly fallo = signal(false);

  protected readonly tipos: { valor: 'all' | TxKind; etiqueta: string }[] = [
    { valor: 'all', etiqueta: 'Todos' },
    { valor: 'expense', etiqueta: 'Gastos' },
    { valor: 'income', etiqueta: 'Ingresos' },
    { valor: 'transfer', etiqueta: 'Transf.' },
  ];

  private readonly categoriaPorId = computed(() => new Map(this.categories.items().map((c) => [c.id, c])));
  private readonly cuentaPorId = computed(() => new Map(this.accounts.items().map((a) => [a.id, a.name])));

  protected readonly totales = computed(() => {
    let ingresos = 0;
    let gastos = 0;
    for (const t of this.filas()) {
      if (t.kind === 'income') ingresos += t.amount;
      else if (t.kind === 'expense') gastos += t.amount;
    }
    return { ingresos, gastos, neto: ingresos - gastos };
  });

  protected readonly dias = computed<Dia[]>(() => {
    const tipo = this.tipo();
    const cuenta = this.cuenta();
    const categoria = this.categoria();
    const visibles = this.filas().filter(
      (t) =>
        (tipo === 'all' || t.kind === tipo) &&
        (!cuenta || t.account_id === cuenta || t.to_account_id === cuenta) &&
        (!categoria || t.category_id === categoria),
    );
    const porDia = new Map<string, Tx[]>();
    for (const t of visibles) porDia.set(t.occurred_on, [...(porDia.get(t.occurred_on) ?? []), t]);
    return [...porDia.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([fecha, items]) => ({
        fecha,
        titulo: formatoDia(fecha),
        items,
        neto: items.reduce((s, t) => s + (t.kind === 'income' ? t.amount : t.kind === 'expense' ? -t.amount : 0), 0),
      }));
  });

  constructor() {
    void Promise.all([this.accounts.load(), this.categories.load()]).catch(() => this.fallo.set(true));
    // Recarga al cambiar de mes y cada vez que un movimiento cambia (la caché ya viene actualizada).
    effect(() => {
      const mes = this.mes();
      this.txs.version();
      void this.cargar(false, mes);
    });
  }

  protected async cargar(forzar = false, mes = this.mes()): Promise<void> {
    this.fallo.set(false);
    if (!this.filas().length || forzar) this.cargando.set(true);
    try {
      const filas = await this.txs.month(mes, forzar);
      if (mes === this.mes()) this.filas.set(filas);
    } catch (e) {
      this.fallo.set(true);
      this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
    } finally {
      this.cargando.set(false);
    }
  }

  protected conSigno = copConSigno;

  protected categoriaDe(t: Tx): Category | undefined {
    return t.category_id ? this.categoriaPorId().get(t.category_id) : undefined;
  }

  protected titulo(t: Tx): string {
    if (t.kind === 'transfer') {
      return `Transferencia: ${this.cuentaPorId().get(t.account_id) ?? '—'} → ${this.cuentaPorId().get(t.to_account_id ?? '') ?? '—'}`;
    }
    return this.categoriaDe(t)?.name ?? 'Sin categoría';
  }

  protected subtitulo(t: Tx): string {
    const cuenta = t.kind === 'transfer' ? '' : this.cuentaPorId().get(t.account_id) ?? '';
    return [t.description, cuenta].filter(Boolean).join(' · ') || ' ';
  }

  protected etiquetaTipo(t: Tx): string {
    return t.kind === 'income' ? 'Ingreso' : t.kind === 'expense' ? 'Gasto' : 'Transferencia';
  }

  protected iconoFila(t: Tx): string {
    return t.kind === 'transfer' ? 'swap_horiz' : (this.categoriaDe(t)?.icon ?? 'category');
  }

  protected colorFila(t: Tx): string {
    return t.kind === 'transfer' ? COLOR_POR_DEFECTO : colorDe(this.categoriaDe(t)?.color ?? null);
  }

  protected editar(tx: Tx): void {
    const ref = this.dialog.open<TxDialog, TxDialogData, boolean | 'eliminar'>(TxDialog, {
      data: { tx },
      width: '520px',
      maxWidth: 'calc(100vw - 24px)',
    });
    ref.afterClosed().subscribe((r) => {
      if (r === 'eliminar') this.eliminar(tx);
    });
  }

  protected eliminar(tx: Tx): void {
    const ref = this.dialog.open<ConfirmDialog, ConfirmData, boolean>(ConfirmDialog, {
      data: {
        titulo: 'Eliminar movimiento',
        mensaje: `Se eliminará «${this.titulo(tx)}» y no se puede deshacer.`,
        confirmar: 'Eliminar',
      },
    });
    ref.afterClosed().subscribe(async (ok) => {
      if (!ok) return;
      try {
        await this.txs.remove(tx.id);
        this.snackBar.open('Movimiento eliminado.', undefined, { duration: 2500 });
      } catch (e) {
        this.snackBar.open((e as Error).message, 'Cerrar', { duration: 6000 });
      }
    });
  }
}
