import { TxLite, gastoPorBolsa, gastosPorCategoria, saldosPorCuenta, totalesDelMes, totalesPorMes } from './aggregates';
import { calcularPresupuesto, estadoBolsa, reglasVigentes, sumaPorcentajes } from './budget';
import { ProyeccionCdt, proyectarCdt, requiereAlerta, interesBrutoPorPeriodo } from './cdt';
import {
  diasEntre, etiquetaMes, fechaDesdeDMY, formatoDia, formatoFecha, hoy, horaBogota, mesesEntre,
  rangoMes, sumarDias, sumarMeses,
} from './dates';
import { cop, copConSigno, parseMonto, porcentaje } from './format';
import { ahorroMensualNecesario, progresoMeta, totalAportado } from './goals';
import { montoMonefy, parsearMonefy, planificarImportacion } from './monefy';
import { estadoSegunPagos, saldoPendiente } from './receivables';

describe('format', () => {
  it('formatea pesos sin decimales', () => {
    expect(cop(1860000).replace(/\s/g, ' ')).toBe('$ 1.860.000');
    expect(cop(0).replace(/\s/g, ' ')).toBe('$ 0');
  });

  it('pone el signo en el texto', () => {
    expect(copConSigno(1000)).toContain('+');
    expect(copConSigno(-1000)).toContain('-');
    expect(copConSigno(0)).not.toMatch(/[+-]/);
  });

  it('acepta montos con y sin separadores', () => {
    expect(parseMonto('50.000')).toBe(50000);
    expect(parseMonto('50000')).toBe(50000);
    expect(parseMonto('$ 1.860.000')).toBe(1860000);
    expect(parseMonto('1.234,5')).toBe(1235);
    expect(parseMonto('abc')).toBeNull();
    expect(parseMonto('')).toBeNull();
    expect(parseMonto('-5')).toBeNull();
  });

  it('formatea porcentajes', () => {
    expect(porcentaje(0.125)).toContain('12,50');
  });
});

describe('dates', () => {
  it('calcula hoy y la hora en Bogotá (UTC-5), no en UTC', () => {
    const ahora = new Date('2026-11-20T03:00:00Z');
    expect(hoy(ahora)).toBe('2026-11-19');
    expect(horaBogota(ahora)).toBe(22);
  });

  it('calcula rangos y desplazamientos de mes', () => {
    expect(rangoMes('2026-02')).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
    expect(rangoMes('2028-02').hasta).toBe('2028-02-29');
    expect(sumarMeses('2026-11', 2)).toBe('2027-01');
    expect(sumarMeses('2026-01', -1)).toBe('2025-12');
    expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01');
  });

  it('cuenta días y meses completos', () => {
    expect(diasEntre('2026-11-19', '2026-12-04')).toBe(15);
    expect(diasEntre('2026-12-04', '2026-11-19')).toBe(-15);
    expect(mesesEntre('2026-01-15', '2026-04-14')).toBe(2);
    expect(mesesEntre('2026-01-15', '2026-04-15')).toBe(3);
  });

  it('no corre el día al mostrar una fecha (sin UTC)', () => {
    expect(formatoFecha('2026-11-19')).toMatch(/^19 nov 2026$/);
    expect(formatoDia('2026-11-19')).toMatch(/jueves.*19 de noviembre/);
    expect(etiquetaMes('2026-11')).toBe('noviembre de 2026');
  });

  it('convierte fechas de Monefy y rechaza las inválidas', () => {
    expect(fechaDesdeDMY('27/02/2026')).toBe('2026-02-27');
    expect(fechaDesdeDMY('9/1/2026')).toBe('2026-01-09');
    expect(fechaDesdeDMY('31/02/2026')).toBeNull();
    expect(fechaDesdeDMY('2026-02-27')).toBeNull();
  });
});

const tx = (p: Partial<TxLite> & Pick<TxLite, 'kind' | 'amount'>): TxLite => ({
  id: Math.random().toString(),
  account_id: 'A',
  to_account_id: null,
  category_id: null,
  occurred_on: '2026-11-10',
  ...p,
});

describe('aggregates', () => {
  const movs = [
    tx({ kind: 'income', amount: 1000, category_id: 'sal' }),
    tx({ kind: 'expense', amount: 300, category_id: 'rest' }),
    tx({ kind: 'transfer', amount: 200, to_account_id: 'B' }),
    tx({ kind: 'expense', amount: 100, category_id: 'rest', occurred_on: '2026-10-05' }),
  ];

  it('calcula saldos con transferencias entrantes y salientes', () => {
    const s = saldosPorCuenta(movs);
    expect(s.get('A')).toBe(1000 - 300 - 200 - 100);
    expect(s.get('B')).toBe(200);
  });

  it('las transferencias no cuentan como ingreso ni gasto', () => {
    expect(totalesDelMes(movs, '2026-11')).toEqual({ ingresos: 1000, gastos: 300, neto: 700 });
    expect(totalesPorMes(movs, ['2026-10', '2026-11'])[0]).toEqual({ mes: '2026-10', ingresos: 0, gastos: 100 });
  });

  it('agrupa gastos por categoría y por bolsa', () => {
    expect(gastosPorCategoria(movs, '2026-11')).toEqual([{ category_id: 'rest', total: 300 }]);
    const bolsas = new Map<string, 'fijos' | 'gustos' | null>([['rest', 'gustos']]);
    expect(gastoPorBolsa(movs, bolsas, '2026-11').gustos).toBe(300);
  });
});

describe('budget', () => {
  const reglas = [
    { bucket: 'ahorro', percent: 50, valid_from: '2026-11-01' },
    { bucket: 'fijos', percent: 20, valid_from: '2026-11-01' },
    { bucket: 'gustos', percent: 20, valid_from: '2026-11-01' },
    { bucket: 'regalos', percent: 10, valid_from: '2026-11-01' },
    { bucket: 'gustos', percent: 25, valid_from: '2026-12-01' },
  ] as const;

  it('usa la regla más reciente vigente en el mes', () => {
    expect(reglasVigentes([...reglas], '2026-11').porcentajes.gustos).toBe(20);
    expect(reglasVigentes([...reglas], '2026-12').porcentajes.gustos).toBe(25);
  });

  it('en meses anteriores a toda regla usa la más antigua y lo avisa', () => {
    const r = reglasVigentes([...reglas], '2026-03');
    expect(r.esFallback).toBe(true);
    expect(r.porcentajes.gustos).toBe(20);
    expect(reglasVigentes([...reglas], '2026-11').esFallback).toBe(false);
  });

  it('marca ok, cerca (desde 85 %) y excedido', () => {
    expect(estadoBolsa(84, 100)).toBe('ok');
    expect(estadoBolsa(85, 100)).toBe('cerca');
    expect(estadoBolsa(100, 100)).toBe('cerca');
    expect(estadoBolsa(101, 100)).toBe('excedido');
    expect(estadoBolsa(0, 0)).toBe('ok');
    expect(estadoBolsa(5, 0)).toBe('excedido');
  });

  it('calcula el presupuesto y el ahorro real', () => {
    const p = calcularPresupuesto(
      1_860_000,
      { ahorro: 50_000, fijos: 300_000, gustos: 400_000, regalos: 100_000 },
      { ahorro: 50, fijos: 20, gustos: 20, regalos: 10 },
    );
    expect(p.bolsas.map((b) => b.asignado)).toEqual([372_000, 372_000, 186_000]);
    expect(p.bolsas.map((b) => b.estado)).toEqual(['ok', 'excedido', 'ok']);
    expect(p.gastosTotales).toBe(800_000);
    // lo movido a la categoría «Ahorro» no es gasto: no resta del ahorro real
    expect(p.ahorro.real).toBe(1_060_000);
    expect(p.ahorro.meta).toBe(930_000);
  });

  it('valida que los porcentajes sumen 100', () => {
    expect(sumaPorcentajes({ ahorro: 50, fijos: 20, gustos: 20, regalos: 10 })).toBe(100);
    expect(sumaPorcentajes({ ahorro: 50, fijos: 20, gustos: 20, regalos: 12.5 })).toBe(102.5);
  });
});

describe('cdt', () => {
  const base = { principal: 10_000_000, rate_ea: 0.125, start_on: '2026-01-01', end_on: '2027-01-01', withholding_rate: 0.04 };

  it('interés mensual: principal × ((1 + EA)^(1/12) − 1)', () => {
    const bruto = interesBrutoPorPeriodo({ ...base, payout_frequency: 'monthly' });
    expect(bruto).toBeCloseTo(98_635.8, 0);
  });

  it('interés neto descuenta la retención', () => {
    const p: ProyeccionCdt = proyectarCdt({ ...base, payout_frequency: 'monthly' });
    expect(p.netoPorPeriodo).toBeCloseTo(p.brutoPorPeriodo * 0.96, 6);
    expect(p.periodos).toBe(12);
    expect(p.netoMensualEquivalente).toBeCloseTo(p.netoPorPeriodo, 6);
  });

  it('al vencimiento usa el exponente días/365', () => {
    const p = proyectarCdt({ ...base, payout_frequency: 'at_maturity' });
    expect(p.periodos).toBe(1);
    expect(p.brutoTotal).toBeCloseTo(1_250_000, 0);
  });

  it('trimestral y semestral usan 1/4 y 1/2', () => {
    const t = interesBrutoPorPeriodo({ ...base, payout_frequency: 'quarterly' });
    expect(t).toBeCloseTo(10_000_000 * (Math.pow(1.125, 0.25) - 1), 4);
    expect(proyectarCdt({ ...base, payout_frequency: 'quarterly' }).periodos).toBe(4);
    expect(proyectarCdt({ ...base, payout_frequency: 'semiannual' }).periodos).toBe(2);
  });

  it('alerta a 15 días o menos, solo si está activo', () => {
    expect(requiereAlerta('2026-12-04', 'active', '2026-11-19')).toBe(true);
    expect(requiereAlerta('2026-12-05', 'active', '2026-11-19')).toBe(false);
    expect(requiereAlerta('2026-11-01', 'active', '2026-11-19')).toBe(true);
    expect(requiereAlerta('2026-12-04', 'matured', '2026-11-19')).toBe(false);
  });
});

describe('goals y receivables', () => {
  it('suma aportes y retiros por meta', () => {
    const aportes = [
      { goal_id: 'm', amount: 500 },
      { goal_id: 'm', amount: -100 },
      { goal_id: 'x', amount: 999 },
    ];
    expect(totalAportado(aportes, 'm')).toBe(400);
    expect(progresoMeta(500, 1000)).toBe(0.5);
    expect(progresoMeta(0, 0)).toBe(0);
  });

  it('proyecta cuánto ahorrar al mes', () => {
    expect(ahorroMensualNecesario(2_000_000, 10_000_000, '2027-03-19', '2026-11-19')).toBe(2_000_000);
    expect(ahorroMensualNecesario(0, 10_000_000, null)).toBeNull();
    expect(ahorroMensualNecesario(10_000_000, 10_000_000, '2027-03-19', '2026-11-19')).toBe(0);
    expect(ahorroMensualNecesario(0, 900, '2026-01-01', '2026-11-19')).toBe(900);
  });

  it('recalcula el estado de un cobro según los pagos', () => {
    expect(saldoPendiente(100, [{ amount: 30 }, { amount: 20 }])).toBe(50);
    expect(saldoPendiente(100, [{ amount: 150 }])).toBe(0);
    expect(estadoSegunPagos('pending', 100, 0)).toBe('pending');
    expect(estadoSegunPagos('pending', 100, 30)).toBe('partial');
    expect(estadoSegunPagos('partial', 100, 100)).toBe('paid');
    expect(estadoSegunPagos('written_off', 100, 30)).toBe('written_off');
  });
});

describe('monefy', () => {
  const CSV = [
    'date,account,category,amount,currency,converted amount,currency,description',
    '27/02/2026,Efectivo,Salario,"1,677,679",COP,"1,677,679",COP,Pago nómina',
    '27/02/2026,Efectivo,Restaurante,"-84,900",COP,"-84,900",COP,"Almuerzo, con comas"',
    '09/10/2026,Banco,Otros,"7,625",COP,"7,625",COP,Pago repetido',
    '09/10/2026,Banco,Otros,"7,625",COP,"7,625",COP,Pago repetido',
    '32/13/2026,Banco,Otros,"1,000",COP,"1,000",COP,fecha mala',
    '10/10/2026,Banco,Otros,abc,COP,abc,COP,monto malo',
    '11/10/2026,Banco,Otros,"-20,000",COP,"-20,000",COP,Presté plata a un amigo',
  ].join('\n');

  it('convierte montos con separadores de miles', () => {
    expect(montoMonefy('1,677,679')).toBe(1677679);
    expect(montoMonefy('-84,900')).toBe(-84900);
    expect(montoMonefy('abc')).toBeNull();
  });

  it('lee el CSV: comas dentro de comillas, signo como tipo y filas inválidas aparte', async () => {
    const { filas, invalidas } = await parsearMonefy(CSV);
    expect(filas).toHaveLength(5);
    expect(invalidas.map((i) => i.linea)).toEqual([6, 7]);
    expect(filas[0]).toMatchObject({ fecha: '2026-02-27', kind: 'income', monto: 1677679, categoria: 'Salario' });
    expect(filas[1]).toMatchObject({ kind: 'expense', monto: 84900, descripcion: 'Almuerzo, con comas' });
  });

  it('las filas idénticas legítimas tienen hash distinto (índice de ocurrencia)', async () => {
    const { filas } = await parsearMonefy(CSV);
    const [a, b] = [filas[2], filas[3]];
    expect([a.ocurrencia, b.ocurrencia]).toEqual([1, 2]);
    expect(a.hash).not.toBe(b.hash);
    expect(a.hash).toHaveLength(64);
  });

  it('el hash es estable al volver a leer el mismo archivo', async () => {
    const uno = await parsearMonefy(CSV);
    const dos = await parsearMonefy(CSV);
    expect(uno.filas.map((f) => f.hash)).toEqual(dos.filas.map((f) => f.hash));
  });

  it('sugiere como posible préstamo las filas con «presté»', async () => {
    const { filas } = await parsearMonefy(CSV);
    expect(filas.filter((f) => f.posiblePrestamo)).toHaveLength(1);
  });

  it('planifica: duplicadas por hash y cuentas o categorías por crear', async () => {
    const { filas } = await parsearMonefy(CSV);
    const plan = planificarImportacion(
      filas,
      [{ name: 'efectivo' }],
      [{ name: 'Salario', kind: 'income' }],
      new Set([filas[0].hash]),
    );
    expect(plan.duplicadas).toHaveLength(1);
    expect(plan.nuevas).toHaveLength(4);
    expect(plan.cuentasFaltantes).toEqual(['Banco']);
    // «Otros» aparece como ingreso y como gasto: son dos categorías (únicas por nombre y tipo)
    expect(plan.categoriasFaltantes.map((c) => `${c.nombre}:${c.kind}`).sort()).toEqual([
      'Otros:expense',
      'Otros:income',
      'Restaurante:expense',
    ]);
    expect(plan.posiblesPrestamos).toHaveLength(1);
  });
});
