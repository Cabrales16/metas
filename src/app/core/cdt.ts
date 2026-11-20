import { diasEntre, hoy, mesesEntre } from './dates';

export type Periodicidad = 'monthly' | 'quarterly' | 'semiannual' | 'at_maturity';

export const ALERTA_DIAS = 15;

export const PERIODICIDADES: { valor: Periodicidad; etiqueta: string }[] = [
  { valor: 'monthly', etiqueta: 'Mensual' },
  { valor: 'quarterly', etiqueta: 'Trimestral' },
  { valor: 'semiannual', etiqueta: 'Semestral' },
  { valor: 'at_maturity', etiqueta: 'Al vencimiento' },
];

export interface CdtDatos {
  principal: number;
  rate_ea: number;
  start_on: string;
  end_on: string;
  payout_frequency: Periodicidad;
  withholding_rate: number;
}

const MESES_POR_PERIODO: Record<Exclude<Periodicidad, 'at_maturity'>, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
};

/** Interés bruto de un periodo: principal × ((1 + EA)^(1/n) − 1); al vencimiento, exponente días/365. */
export function interesBrutoPorPeriodo(c: CdtDatos): number {
  if (c.payout_frequency === 'at_maturity') {
    return c.principal * (Math.pow(1 + c.rate_ea, diasEntre(c.start_on, c.end_on) / 365) - 1);
  }
  const mesesPeriodo = MESES_POR_PERIODO[c.payout_frequency];
  return c.principal * (Math.pow(1 + c.rate_ea, mesesPeriodo / 12) - 1);
}

export interface ProyeccionCdt {
  periodos: number;
  brutoPorPeriodo: number;
  netoPorPeriodo: number;
  brutoTotal: number;
  netoTotal: number;
  /** Interés neto mensual equivalente, para ver «interés mes a mes». */
  netoMensualEquivalente: number;
}

export function proyectarCdt(c: CdtDatos): ProyeccionCdt {
  const brutoPorPeriodo = interesBrutoPorPeriodo(c);
  const neto = (x: number) => x * (1 - c.withholding_rate);
  const meses = Math.max(1, mesesEntre(c.start_on, c.end_on));
  const periodos = c.payout_frequency === 'at_maturity' ? 1 : Math.max(1, Math.floor(meses / MESES_POR_PERIODO[c.payout_frequency]));
  const brutoTotal = brutoPorPeriodo * periodos;
  const netoTotal = neto(brutoTotal);
  const mesesCubiertos = c.payout_frequency === 'at_maturity' ? meses : periodos * MESES_POR_PERIODO[c.payout_frequency];
  return {
    periodos,
    brutoPorPeriodo,
    netoPorPeriodo: neto(brutoPorPeriodo),
    brutoTotal,
    netoTotal,
    netoMensualEquivalente: netoTotal / Math.max(1, mesesCubiertos),
  };
}

export function diasAlVencimiento(end_on: string, referencia: string = hoy()): number {
  return diasEntre(referencia, end_on);
}

export function requiereAlerta(end_on: string, status: string, referencia: string = hoy()): boolean {
  return status === 'active' && diasAlVencimiento(end_on, referencia) <= ALERTA_DIAS;
}
