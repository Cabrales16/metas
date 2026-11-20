import { Injectable, inject, signal } from '@angular/core';

import { Bucket } from './catalog';
import { Regla } from './budget';
import { traducirErrorDb } from './db-errors';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly db = inject(SupabaseService).client;
  private readonly _reglas = signal<Regla[]>([]);
  private cargado = false;

  readonly reglas = this._reglas.asReadonly();

  async load(forzar = false): Promise<void> {
    if (this.cargado && !forzar) return;
    const { data, error } = await this.db.from('budget_rules').select('bucket,percent,valid_from');
    if (error) throw new Error(traducirErrorDb(error, 'Ya existe esa regla.'));
    this._reglas.set(data.map((r) => ({ bucket: r.bucket, percent: Number(r.percent), valid_from: r.valid_from })));
    this.cargado = true;
  }

  /**
   * Guarda un juego de porcentajes con vigencia desde `validFrom` (primer día de un mes).
   * Si ya hay reglas con esa misma vigencia, se reemplazan (la tabla es única por bolsa y vigencia).
   */
  async guardar(porcentajes: Record<Bucket, number>, validFrom: string): Promise<void> {
    const filas = (Object.keys(porcentajes) as Bucket[]).map((bucket) => ({
      bucket,
      percent: porcentajes[bucket],
      valid_from: validFrom,
    }));
    const { error } = await this.db
      .from('budget_rules')
      .upsert(filas, { onConflict: 'user_id,bucket,valid_from' });
    if (error) throw new Error(traducirErrorDb(error, 'Ya existe esa regla.'));
    await this.load(true);
  }
}
