import { Bucket } from './catalog';
import { mesDe } from './dates';

export type TxKind = 'income' | 'expense' | 'transfer';

/** Fila liviana de un movimiento: lo justo para saldos, totales y presupuesto. */
export interface TxLite {
  id: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  kind: TxKind;
  amount: number;
  occurred_on: string;
}

/** Saldo = ingresos + transferencias entrantes − gastos − transferencias salientes. */
export function saldosPorCuenta(movimientos: TxLite[]): Map<string, number> {
  const saldos = new Map<string, number>();
  const sumar = (id: string, v: number) => saldos.set(id, (saldos.get(id) ?? 0) + v);
  for (const t of movimientos) {
    if (t.kind === 'income') sumar(t.account_id, t.amount);
    else if (t.kind === 'expense') sumar(t.account_id, -t.amount);
    else {
      sumar(t.account_id, -t.amount);
      if (t.to_account_id) sumar(t.to_account_id, t.amount);
    }
  }
  return saldos;
}

export interface TotalesMes {
  ingresos: number;
  gastos: number;
  neto: number;
}

/** Ingresos y gastos de un mes. Las transferencias no cuentan: solo mueven dinero entre cuentas. */
export function totalesDelMes(movimientos: TxLite[], ym: string): TotalesMes {
  let ingresos = 0;
  let gastos = 0;
  for (const t of movimientos) {
    if (mesDe(t.occurred_on) !== ym) continue;
    if (t.kind === 'income') ingresos += t.amount;
    else if (t.kind === 'expense') gastos += t.amount;
  }
  return { ingresos, gastos, neto: ingresos - gastos };
}

export function totalesPorMes(movimientos: TxLite[], meses: string[]): { mes: string; ingresos: number; gastos: number }[] {
  const base = new Map(meses.map((m) => [m, { mes: m, ingresos: 0, gastos: 0 }]));
  for (const t of movimientos) {
    const fila = base.get(mesDe(t.occurred_on));
    if (!fila) continue;
    if (t.kind === 'income') fila.ingresos += t.amount;
    else if (t.kind === 'expense') fila.gastos += t.amount;
  }
  return meses.map((m) => base.get(m)!);
}

export function gastosPorCategoria(movimientos: TxLite[], ym: string): { category_id: string; total: number }[] {
  const por = new Map<string, number>();
  for (const t of movimientos) {
    if (t.kind !== 'expense' || !t.category_id || mesDe(t.occurred_on) !== ym) continue;
    por.set(t.category_id, (por.get(t.category_id) ?? 0) + t.amount);
  }
  return [...por.entries()].map(([category_id, total]) => ({ category_id, total })).sort((a, b) => b.total - a.total);
}

/** Gasto del mes por bolsa del presupuesto, según la bolsa actual de cada categoría. */
export function gastoPorBolsa(
  movimientos: TxLite[],
  bolsaDeCategoria: Map<string, Bucket | null>,
  ym: string,
): Record<Bucket, number> {
  const r: Record<Bucket, number> = { ahorro: 0, fijos: 0, gustos: 0, regalos: 0 };
  for (const t of movimientos) {
    if (t.kind !== 'expense' || !t.category_id || mesDe(t.occurred_on) !== ym) continue;
    const bolsa = bolsaDeCategoria.get(t.category_id);
    if (bolsa) r[bolsa] += t.amount;
  }
  return r;
}
