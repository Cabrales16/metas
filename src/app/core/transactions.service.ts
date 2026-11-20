import { Injectable, inject, signal } from '@angular/core';

import { TxLite } from './aggregates';
import { rangoMes, mesDe } from './dates';
import { Tables, TablesInsert, TablesUpdate } from './database.types';
import { traducirErrorDb } from './db-errors';
import { leerTodo } from './paging';
import { SupabaseService } from './supabase.service';

export type Tx = Tables<'transactions'>;

const DUPLICADO = 'Ya existe un movimiento igual.';
const COLUMNAS_LIVIANAS = 'id,account_id,to_account_id,category_id,kind,amount,occurred_on';

const aLiviana = (t: Tx): TxLite => ({
  id: t.id,
  account_id: t.account_id,
  to_account_id: t.to_account_id,
  category_id: t.category_id,
  kind: t.kind,
  amount: t.amount,
  occurred_on: t.occurred_on,
});

const porFechaDesc = (a: Tx, b: Tx) =>
  b.occurred_on.localeCompare(a.occurred_on) || b.created_at.localeCompare(a.created_at);

/**
 * Movimientos. Dos vistas de los mismos datos:
 *  - `light`: todos los movimientos con pocas columnas (saldos, totales, presupuesto), leídos una vez.
 *  - `month(ym)`: filas completas de un mes para la lista, con caché por mes.
 * Cada alta, edición o baja actualiza ambas en memoria, sin volver a consultar.
 */
@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private readonly db = inject(SupabaseService).client;

  private readonly _light = signal<TxLite[]>([]);
  private lightCargado = false;
  private lightEnCurso?: Promise<void>;
  private readonly meses = new Map<string, Tx[]>();

  readonly light = this._light.asReadonly();
  /** Sube con cada cambio: sirve para que las pantallas recalculen. */
  readonly version = signal(0);

  ensureLight(forzar = false): Promise<void> {
    if (this.lightCargado && !forzar) return Promise.resolve();
    this.lightEnCurso ??= (async () => {
      try {
        const filas = await leerTodo<TxLite>((d, h) =>
          this.db
            .from('transactions')
            .select(COLUMNAS_LIVIANAS)
            .order('occurred_on', { ascending: false })
            .order('id')
            .range(d, h),
        );
        this._light.set(filas);
        this.lightCargado = true;
      } finally {
        this.lightEnCurso = undefined;
      }
    })();
    return this.lightEnCurso;
  }

  async month(ym: string, forzar = false): Promise<Tx[]> {
    const guardado = this.meses.get(ym);
    if (guardado && !forzar) return guardado;
    const { desde, hasta } = rangoMes(ym);
    const filas = await leerTodo<Tx>((d, h) =>
      this.db
        .from('transactions')
        .select('*')
        .gte('occurred_on', desde)
        .lte('occurred_on', hasta)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id')
        .range(d, h),
    );
    this.meses.set(ym, filas);
    return filas;
  }

  async create(input: TablesInsert<'transactions'>): Promise<Tx> {
    const { data, error } = await this.db.from('transactions').insert(input).select().single();
    if (error) throw new Error(traducirErrorDb(error, DUPLICADO));
    this.agregarLocal(data);
    return data;
  }

  async update(id: string, cambios: TablesUpdate<'transactions'>): Promise<Tx> {
    const { data, error } = await this.db.from('transactions').update(cambios).eq('id', id).select().single();
    if (error) throw new Error(traducirErrorDb(error, DUPLICADO));
    this.quitarLocal(id);
    this.agregarLocal(data);
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('transactions').delete().eq('id', id);
    if (error) throw new Error(traducirErrorDb(error, DUPLICADO));
    this.quitarLocal(id);
    this.version.update((v) => v + 1);
  }

  /** Descarta las cachés (por ejemplo, tras importar muchas filas). */
  async recargarTodo(): Promise<void> {
    this.meses.clear();
    await this.ensureLight(true);
    this.version.update((v) => v + 1);
  }

  private quitarLocal(id: string): void {
    this._light.update((l) => l.filter((t) => t.id !== id));
    for (const [ym, filas] of this.meses) this.meses.set(ym, filas.filter((t) => t.id !== id));
  }

  private agregarLocal(t: Tx): void {
    this._light.update((l) => [aLiviana(t), ...l]);
    const mes = this.meses.get(mesDe(t.occurred_on));
    if (mes) this.meses.set(mesDe(t.occurred_on), [...mes, t].sort(porFechaDesc));
    this.version.update((v) => v + 1);
  }
}
