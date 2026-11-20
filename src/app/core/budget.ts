import { Bucket } from './catalog';
import { rangoMes } from './dates';

export interface Regla {
  bucket: Bucket;
  percent: number;
  valid_from: string;
}

export type EstadoBolsa = 'ok' | 'cerca' | 'excedido';

export const BOLSAS_CON_LIMITE: Bucket[] = ['fijos', 'gustos', 'regalos'];
export const UMBRAL_CERCA = 0.85;

/**
 * Regla vigente por bolsa: la más reciente con valid_from ≤ fin del mes consultado.
 * Si el mes es anterior a toda regla (por ejemplo, historial importado), usa la más antigua y lo avisa.
 */
export function reglasVigentes(reglas: Regla[], ym: string): { porcentajes: Record<Bucket, number>; esFallback: boolean } {
  const hasta = rangoMes(ym).hasta;
  const porcentajes: Record<Bucket, number> = { ahorro: 0, fijos: 0, gustos: 0, regalos: 0 };
  let esFallback = false;
  for (const bucket of Object.keys(porcentajes) as Bucket[]) {
    const propias = reglas.filter((r) => r.bucket === bucket).sort((a, b) => b.valid_from.localeCompare(a.valid_from));
    const vigente = propias.find((r) => r.valid_from <= hasta);
    if (vigente) porcentajes[bucket] = Number(vigente.percent);
    else if (propias.length) {
      porcentajes[bucket] = Number(propias[propias.length - 1].percent);
      esFallback = true;
    }
  }
  return { porcentajes, esFallback };
}

export function estadoBolsa(gastado: number, asignado: number): EstadoBolsa {
  if (asignado <= 0) return gastado > 0 ? 'excedido' : 'ok';
  const ratio = gastado / asignado;
  if (ratio > 1) return 'excedido';
  return ratio >= UMBRAL_CERCA ? 'cerca' : 'ok';
}

export interface BolsaCalculada {
  bucket: Bucket;
  percent: number;
  asignado: number;
  gastado: number;
  restante: number;
  ratio: number;
  estado: EstadoBolsa;
}

export interface Presupuesto {
  base: number;
  bolsas: BolsaCalculada[];
  gastosTotales: number;
  ahorro: { metaPercent: number; meta: number; real: number; ratio: number };
}

/**
 * Presupuesto del mes. Base = ingresos. Las bolsas con límite son fijos, gustos y regalos.
 * Ahorro real = ingresos − gastos de esas bolsas; los gastos de la categoría «Ahorro» son dinero
 * movido a ahorro, no gasto, y no restan.
 */
export function calcularPresupuesto(
  ingresos: number,
  gastoPorBolsa: Record<Bucket, number>,
  porcentajes: Record<Bucket, number>,
): Presupuesto {
  const bolsas = BOLSAS_CON_LIMITE.map((bucket): BolsaCalculada => {
    const asignado = Math.round((ingresos * porcentajes[bucket]) / 100);
    const gastado = gastoPorBolsa[bucket];
    return {
      bucket,
      percent: porcentajes[bucket],
      asignado,
      gastado,
      restante: asignado - gastado,
      ratio: asignado > 0 ? gastado / asignado : gastado > 0 ? Infinity : 0,
      estado: estadoBolsa(gastado, asignado),
    };
  });
  const gastosTotales = bolsas.reduce((s, b) => s + b.gastado, 0);
  const meta = Math.round((ingresos * porcentajes.ahorro) / 100);
  const real = ingresos - gastosTotales;
  return {
    base: ingresos,
    bolsas,
    gastosTotales,
    ahorro: { metaPercent: porcentajes.ahorro, meta, real, ratio: meta > 0 ? real / meta : 0 },
  };
}

/** Los porcentajes deben sumar 100. */
export function sumaPorcentajes(p: Record<Bucket, number>): number {
  return Math.round((p.ahorro + p.fijos + p.gustos + p.regalos) * 100) / 100;
}
