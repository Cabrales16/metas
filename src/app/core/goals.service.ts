import { Injectable, inject, signal } from '@angular/core';

import { Tables, TablesInsert, TablesUpdate } from './database.types';
import { traducirErrorDb } from './db-errors';
import { SupabaseService } from './supabase.service';

export type Goal = Tables<'goals'>;
export type Aporte = Tables<'goal_contributions'>;

const MSG = 'Ya existe un registro igual.';

@Injectable({ providedIn: 'root' })
export class GoalsService {
  private readonly db = inject(SupabaseService).client;
  private readonly _goals = signal<Goal[]>([]);
  private readonly _aportes = signal<Aporte[]>([]);
  private cargado = false;

  readonly goals = this._goals.asReadonly();
  readonly aportes = this._aportes.asReadonly();

  async load(forzar = false): Promise<void> {
    if (this.cargado && !forzar) return;
    const [g, a] = await Promise.all([
      this.db.from('goals').select('*').order('created_at'),
      this.db.from('goal_contributions').select('*').order('contributed_on', { ascending: false }).order('created_at', { ascending: false }),
    ]);
    if (g.error) throw new Error(traducirErrorDb(g.error, MSG));
    if (a.error) throw new Error(traducirErrorDb(a.error, MSG));
    this._goals.set(g.data);
    this._aportes.set(a.data);
    this.cargado = true;
  }

  async createGoal(input: TablesInsert<'goals'>): Promise<Goal> {
    const { data, error } = await this.db.from('goals').insert(input).select().single();
    if (error) throw new Error(traducirErrorDb(error, MSG));
    this._goals.update((l) => [...l, data]);
    return data;
  }

  async updateGoal(id: string, cambios: TablesUpdate<'goals'>): Promise<Goal> {
    const { data, error } = await this.db.from('goals').update(cambios).eq('id', id).select().single();
    if (error) throw new Error(traducirErrorDb(error, MSG));
    this._goals.update((l) => l.map((g) => (g.id === id ? data : g)));
    return data;
  }

  async addAporte(input: TablesInsert<'goal_contributions'>): Promise<Aporte> {
    const { data, error } = await this.db.from('goal_contributions').insert(input).select().single();
    if (error) throw new Error(traducirErrorDb(error, MSG));
    this._aportes.update((l) => [data, ...l]);
    return data;
  }

  async removeAporte(id: string): Promise<void> {
    const { error } = await this.db.from('goal_contributions').delete().eq('id', id);
    if (error) throw new Error(traducirErrorDb(error, MSG));
    this._aportes.update((l) => l.filter((a) => a.id !== id));
  }
}
