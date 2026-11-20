import { Injectable, inject, signal } from '@angular/core';

import { Tables, TablesInsert, TablesUpdate } from './database.types';
import { traducirErrorDb } from './db-errors';
import { SupabaseService } from './supabase.service';

export type Investment = Tables<'investments'>;

const MSG = 'Ya existe un registro igual.';

@Injectable({ providedIn: 'root' })
export class InvestmentsService {
  private readonly db = inject(SupabaseService).client;
  private readonly _items = signal<Investment[]>([]);
  private cargado = false;

  readonly items = this._items.asReadonly();

  async load(forzar = false): Promise<void> {
    if (this.cargado && !forzar) return;
    const { data, error } = await this.db.from('investments').select('*').order('end_on');
    if (error) throw new Error(traducirErrorDb(error, MSG));
    this._items.set(data);
    this.cargado = true;
  }

  async create(input: TablesInsert<'investments'>): Promise<Investment> {
    const { data, error } = await this.db.from('investments').insert(input).select().single();
    if (error) throw new Error(traducirErrorDb(error, MSG));
    this._items.update((l) => [...l, data].sort((a, b) => a.end_on.localeCompare(b.end_on)));
    return data;
  }

  async update(id: string, cambios: TablesUpdate<'investments'>): Promise<Investment> {
    const { data, error } = await this.db.from('investments').update(cambios).eq('id', id).select().single();
    if (error) throw new Error(traducirErrorDb(error, MSG));
    this._items.update((l) => l.map((i) => (i.id === id ? data : i)).sort((a, b) => a.end_on.localeCompare(b.end_on)));
    return data;
  }
}
