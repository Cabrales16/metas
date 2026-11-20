import { hoy, mesesEntre } from './dates';

/** Imagen de portada de una meta según su nombre; null si no hay una que le haga honor. */
export function imagenDeMeta(nombre: string): string | null {
  return /moto/i.test(nombre) ? 'img/meta-moto.jpg' : null;
}

export interface AporteMeta {
  goal_id: string;
  amount: number; // negativo = retiro
}

export function totalAportado(aportes: AporteMeta[], goalId: string): number {
  return aportes.filter((a) => a.goal_id === goalId).reduce((s, a) => s + a.amount, 0);
}

/** Progreso entre 0 y 1 (puede pasar de 1 si se aportó de más). */
export function progresoMeta(aportado: number, objetivo: number): number {
  return objetivo > 0 ? Math.max(0, aportado / objetivo) : 0;
}

/**
 * Cuánto ahorrar al mes para llegar a la fecha objetivo. null si no hay fecha, 0 si ya se alcanzó.
 * Si la fecha ya pasó o es este mes, el faltante cae en un solo mes.
 */
export function ahorroMensualNecesario(
  aportado: number,
  objetivo: number,
  fechaObjetivo: string | null,
  referencia: string = hoy(),
): number | null {
  if (!fechaObjetivo) return null;
  const faltante = Math.max(0, objetivo - aportado);
  if (faltante === 0) return 0;
  const meses = Math.max(1, mesesEntre(referencia, fechaObjetivo));
  return Math.ceil(faltante / meses);
}
