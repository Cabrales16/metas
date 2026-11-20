import { Injectable, inject } from '@angular/core';

import { AccountsService } from './accounts.service';
import { AccountType, Bucket, CategoryKind } from './catalog';
import { CategoriesService } from './categories.service';
import { traducirErrorDb } from './db-errors';
import { FilaMonefy } from './monefy';
import { leerTodo } from './paging';
import { ReceivablesService } from './receivables.service';
import { SupabaseService } from './supabase.service';
import { TransactionsService } from './transactions.service';

const LOTE = 200;
const norm = (s: string) => s.trim().toLowerCase();

export interface FaltantesElegidos {
  cuentas: { nombre: string; type: AccountType }[];
  categorias: { nombre: string; kind: CategoryKind; bucket: Bucket | null }[];
}

export interface ResumenImportacion {
  insertadas: number;
  yaExistian: number;
  comoPrestamo: number;
}

@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly db = inject(SupabaseService).client;
  private readonly accounts = inject(AccountsService);
  private readonly categories = inject(CategoriesService);
  private readonly transactions = inject(TransactionsService);
  private readonly receivables = inject(ReceivablesService);

  /** Hashes ya guardados dentro del rango de fechas del archivo (para detectar duplicados en la vista previa). */
  async hashesExistentes(desde: string, hasta: string): Promise<Set<string>> {
    const filas = await leerTodo<{ import_hash: string | null; id: string }>((d, h) =>
      this.db
        .from('transactions')
        .select('import_hash,id')
        .not('import_hash', 'is', null)
        .gte('occurred_on', desde)
        .lte('occurred_on', hasta)
        .order('id')
        .range(d, h),
    );
    return new Set(filas.map((f) => f.import_hash!).filter(Boolean));
  }

  /**
   * Importa en lotes con upsert (ignora duplicados por user_id + import_hash), así se puede reimportar sin duplicar.
   * Las filas marcadas como préstamo no se guardan como movimiento: se crean como cobros por cobrar.
   */
  async importar(
    filas: FilaMonefy[],
    faltantes: FaltantesElegidos,
    comoPrestamo: Set<string>,
    progreso: (hecho: number, total: number) => void,
  ): Promise<ResumenImportacion> {
    await Promise.all([this.accounts.load(), this.categories.load()]);
    for (const c of faltantes.cuentas) await this.accounts.create({ name: c.nombre, type: c.type });
    for (const c of faltantes.categorias) {
      await this.categories.create({ name: c.nombre, kind: c.kind, bucket: c.kind === 'expense' ? c.bucket : null });
    }

    const idCuenta = new Map(this.accounts.items().map((a) => [norm(a.name), a.id]));
    const idCategoria = new Map(this.categories.items().map((c) => [`${norm(c.name)}|${c.kind}`, c.id]));

    const prestamos = filas.filter((f) => comoPrestamo.has(f.hash));
    for (const f of prestamos) {
      await this.receivables.create({
        person: 'Por definir',
        amount: f.monto,
        lent_on: f.fecha,
        notes: f.descripcion || null,
      });
    }

    const aImportar = filas.filter((f) => !comoPrestamo.has(f.hash));
    let insertadas = 0;
    for (let i = 0; i < aImportar.length; i += LOTE) {
      const lote = aImportar.slice(i, i + LOTE).map((f) => ({
        account_id: idCuenta.get(norm(f.cuenta))!,
        category_id: idCategoria.get(`${norm(f.categoria)}|${f.kind}`)!,
        kind: f.kind,
        amount: f.monto,
        occurred_on: f.fecha,
        description: f.descripcion || null,
        source: 'monefy',
        import_hash: f.hash,
      }));
      const { data, error } = await this.db
        .from('transactions')
        .upsert(lote, { onConflict: 'user_id,import_hash', ignoreDuplicates: true })
        .select('id');
      if (error) throw new Error(traducirErrorDb(error, 'Ya existe un movimiento igual.'));
      insertadas += data.length;
      progreso(Math.min(i + LOTE, aImportar.length), aImportar.length);
    }
    await this.transactions.recargarTodo();
    return { insertadas, yaExistian: aImportar.length - insertadas, comoPrestamo: prestamos.length };
  }
}
