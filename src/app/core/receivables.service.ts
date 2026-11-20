import { Injectable, inject, signal } from '@angular/core';

import { Tables, TablesInsert, TablesUpdate } from './database.types';
import { traducirErrorDb } from './db-errors';
import { EstadoCobro, estadoSegunPagos, totalPagado } from './receivables';
import { SupabaseService } from './supabase.service';

export type Cobro = Tables<'receivables'>;
export type PagoCobro = Tables<'receivable_payments'>;

const MSG = 'Ya existe un registro igual.';

@Injectable({ providedIn: 'root' })
export class ReceivablesService {
  private readonly db = inject(SupabaseService).client;
  private readonly _cobros = signal<Cobro[]>([]);
  private readonly _pagos = signal<PagoCobro[]>([]);
  private cargado = false;

  readonly cobros = this._cobros.asReadonly();
  readonly pagos = this._pagos.asReadonly();

  async load(forzar = false): Promise<void> {
    if (this.cargado && !forzar) return;
    const [c, p] = await Promise.all([
      this.db.from('receivables').select('*').order('lent_on', { ascending: false }),
      this.db.from('receivable_payments').select('*').order('paid_on', { ascending: false }),
    ]);
    if (c.error) throw new Error(traducirErrorDb(c.error, MSG));
    if (p.error) throw new Error(traducirErrorDb(p.error, MSG));
    this._cobros.set(c.data);
    this._pagos.set(p.data);
    this.cargado = true;
  }

  async create(input: TablesInsert<'receivables'>): Promise<Cobro> {
    const { data, error } = await this.db.from('receivables').insert(input).select().single();
    if (error) throw new Error(traducirErrorDb(error, MSG));
    this._cobros.update((l) => [data, ...l]);
    return data;
  }

  async update(id: string, cambios: TablesUpdate<'receivables'>): Promise<Cobro> {
    const { data, error } = await this.db.from('receivables').update(cambios).eq('id', id).select().single();
    if (error) throw new Error(traducirErrorDb(error, MSG));
    this._cobros.update((l) => l.map((c) => (c.id === id ? data : c)));
    return data;
  }

  /** Registra un pago y recalcula el estado del cobro (pending → partial → paid). */
  async addPago(cobro: Cobro, monto: number, fecha: string): Promise<void> {
    const { data, error } = await this.db
      .from('receivable_payments')
      .insert({ receivable_id: cobro.id, amount: monto, paid_on: fecha })
      .select()
      .single();
    if (error) throw new Error(traducirErrorDb(error, MSG));
    this._pagos.update((l) => [data, ...l]);
    await this.recalcular(cobro);
  }

  async removePago(pago: PagoCobro): Promise<void> {
    const { error } = await this.db.from('receivable_payments').delete().eq('id', pago.id);
    if (error) throw new Error(traducirErrorDb(error, MSG));
    this._pagos.update((l) => l.filter((p) => p.id !== pago.id));
    const cobro = this._cobros().find((c) => c.id === pago.receivable_id);
    if (cobro) await this.recalcular(cobro);
  }

  private async recalcular(cobro: Cobro): Promise<void> {
    const pagado = totalPagado(this._pagos().filter((p) => p.receivable_id === cobro.id));
    const estado: EstadoCobro = estadoSegunPagos(cobro.status, cobro.amount, pagado);
    if (estado !== cobro.status) await this.update(cobro.id, { status: estado });
  }
}
