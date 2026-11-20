import { PostgrestError } from '@supabase/supabase-js';

/**
 * Convierte un error de Supabase (PostgREST) en un mensaje claro en español.
 * `duplicado` es el texto a mostrar cuando se viola una restricción UNIQUE.
 */
export function traducirErrorDb(error: PostgrestError, duplicado: string): string {
  if (error.code === '23505') return duplicado;
  if (error.code === '42501') return 'No tienes permiso para esta acción. Vuelve a iniciar sesión.';
  if (!error.code && (!navigator.onLine || /failed to fetch|network/i.test(error.message))) {
    return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
  }
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}
