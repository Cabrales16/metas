export type EstadoCobro = 'pending' | 'partial' | 'paid' | 'written_off';

export function totalPagado(pagos: { amount: number }[]): number {
  return pagos.reduce((s, p) => s + p.amount, 0);
}

/** Saldo pendiente = monto − pagos (nunca negativo). */
export function saldoPendiente(monto: number, pagos: { amount: number }[]): number {
  return Math.max(0, monto - totalPagado(pagos));
}

/** Estado según los pagos: pending → partial → paid. Un cobro dado de baja no se reabre solo. */
export function estadoSegunPagos(actual: EstadoCobro, monto: number, pagado: number): EstadoCobro {
  if (actual === 'written_off') return actual;
  if (pagado >= monto) return 'paid';
  return pagado > 0 ? 'partial' : 'pending';
}
