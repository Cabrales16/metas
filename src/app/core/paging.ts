import { PostgrestError } from '@supabase/supabase-js';

import { traducirErrorDb } from './db-errors';

const PAGINA = 1000; // límite por defecto de PostgREST

/**
 * Lee todas las filas de una consulta paginando de a 1000 (Supabase corta en 1000 sin avisar).
 * La consulta debe tener un orden estable (por ejemplo, fecha e id).
 */
export async function leerTodo<T>(
  pagina: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await pagina(desde, desde + PAGINA - 1);
    if (error) throw new Error(traducirErrorDb(error, 'Ya existe un registro igual.'));
    filas.push(...(data ?? []));
    if (!data || data.length < PAGINA) return filas;
  }
}
