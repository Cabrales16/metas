import { Injectable, inject, signal } from '@angular/core';

import { AccountsService } from './accounts.service';
import { BudgetService } from './budget.service';
import { CategoriesService } from './categories.service';
import { GoalsService } from './goals.service';
import { InvestmentsService } from './investments.service';
import { ReceivablesService } from './receivables.service';
import { TransactionsService } from './transactions.service';

/** Vuelve a leer de Supabase todo lo que la app tiene en memoria (el botón de recargar). */
@Injectable({ providedIn: 'root' })
export class RefreshService {
  private readonly txs = inject(TransactionsService);
  private readonly accounts = inject(AccountsService);
  private readonly categories = inject(CategoriesService);
  private readonly goals = inject(GoalsService);
  private readonly investments = inject(InvestmentsService);
  private readonly receivables = inject(ReceivablesService);
  private readonly budget = inject(BudgetService);

  readonly recargando = signal(false);
  /** Marca de tiempo de la última lectura completa. */
  readonly ultima = signal(Date.now());

  async recargar(): Promise<void> {
    if (this.recargando()) return;
    this.recargando.set(true);
    try {
      await Promise.all([
        this.txs.recargarTodo(),
        this.accounts.load(true),
        this.categories.load(true),
        this.goals.load(true),
        this.investments.load(true),
        this.receivables.load(true),
        this.budget.load(true),
        // Mínimo de medio segundo para que el giro se perciba aunque la red sea rápida.
        new Promise((r) => setTimeout(r, 500)),
      ]);
      this.ultima.set(Date.now());
    } finally {
      this.recargando.set(false);
    }
  }
}
