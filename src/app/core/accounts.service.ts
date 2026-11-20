import { Injectable, computed, inject, signal } from '@angular/core';

import { Account, porNombre } from './catalog';
import { TablesInsert, TablesUpdate } from './database.types';
import { traducirErrorDb } from './db-errors';
import { SupabaseService } from './supabase.service';

const DUPLICADO = 'Ya existe una cuenta con ese nombre.';

/** Catálogo de cuentas en memoria: se lee una vez y cada cambio actualiza el signal sin volver a consultar. */
@Injectable({ providedIn: 'root' })
export class AccountsService {
  private readonly db = inject(SupabaseService).client;

  private readonly _items = signal<Account[]>([]);
  private readonly _loading = signal(false);
  private loaded = false;

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly activas = computed(() => this._items().filter((a) => !a.is_archived));

  async load(force = false): Promise<void> {
    if ((this.loaded && !force) || this._loading()) return;
    this._loading.set(true);
    try {
      const { data, error } = await this.db.from('accounts').select('*');
      if (error) throw new Error(traducirErrorDb(error, DUPLICADO));
      this._items.set([...data].sort(porNombre));
      this.loaded = true;
    } finally {
      this._loading.set(false);
    }
  }

  async create(input: TablesInsert<'accounts'>): Promise<Account> {
    const { data, error } = await this.db.from('accounts').insert(input).select().single();
    if (error) throw new Error(traducirErrorDb(error, DUPLICADO));
    this._items.update((lista) => [...lista, data].sort(porNombre));
    return data;
  }

  async update(id: string, cambios: TablesUpdate<'accounts'>): Promise<Account> {
    const { data, error } = await this.db
      .from('accounts')
      .update(cambios)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(traducirErrorDb(error, DUPLICADO));
    this._items.update((lista) => lista.map((a) => (a.id === id ? data : a)).sort(porNombre));
    return data;
  }

  setArchived(id: string, archivada: boolean): Promise<Account> {
    return this.update(id, { is_archived: archivada });
  }
}
