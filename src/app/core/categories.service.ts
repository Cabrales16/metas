import { Injectable, computed, inject, signal } from '@angular/core';

import { Category, porNombre } from './catalog';
import { TablesInsert, TablesUpdate } from './database.types';
import { traducirErrorDb } from './db-errors';
import { SupabaseService } from './supabase.service';

const DUPLICADO = 'Ya existe una categoría con ese nombre y tipo.';

/** Catálogo de categorías en memoria: se lee una vez y cada cambio actualiza el signal sin volver a consultar. */
@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly db = inject(SupabaseService).client;

  private readonly _items = signal<Category[]>([]);
  private readonly _loading = signal(false);
  private loaded = false;

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly activas = computed(() => this._items().filter((c) => !c.is_archived));
  readonly gastos = computed(() => this.activas().filter((c) => c.kind === 'expense'));
  readonly ingresos = computed(() => this.activas().filter((c) => c.kind === 'income'));

  async load(force = false): Promise<void> {
    if ((this.loaded && !force) || this._loading()) return;
    this._loading.set(true);
    try {
      const { data, error } = await this.db.from('categories').select('*');
      if (error) throw new Error(traducirErrorDb(error, DUPLICADO));
      this._items.set([...data].sort(porNombre));
      this.loaded = true;
    } finally {
      this._loading.set(false);
    }
  }

  async create(input: TablesInsert<'categories'>): Promise<Category> {
    const { data, error } = await this.db.from('categories').insert(input).select().single();
    if (error) throw new Error(traducirErrorDb(error, DUPLICADO));
    this._items.update((lista) => [...lista, data].sort(porNombre));
    return data;
  }

  async update(id: string, cambios: TablesUpdate<'categories'>): Promise<Category> {
    const { data, error } = await this.db
      .from('categories')
      .update(cambios)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(traducirErrorDb(error, DUPLICADO));
    this._items.update((lista) => lista.map((c) => (c.id === id ? data : c)).sort(porNombre));
    return data;
  }

  setArchived(id: string, archivada: boolean): Promise<Category> {
    return this.update(id, { is_archived: archivada });
  }
}
