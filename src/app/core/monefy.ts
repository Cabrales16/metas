import Papa from 'papaparse';

import { CategoryKind } from './catalog';
import { fechaDesdeDMY } from './dates';

export interface FilaMonefy {
  /** Línea del archivo (1 = primera), para mostrar errores. */
  linea: number;
  fecha: string; // yyyy-MM-dd
  cuenta: string;
  categoria: string;
  kind: CategoryKind;
  /** Valor absoluto, entero. */
  monto: number;
  descripcion: string;
  ocurrencia: number;
  hash: string;
  posiblePrestamo: boolean;
}

export interface ResultadoParseo {
  filas: FilaMonefy[];
  invalidas: { linea: number; motivo: string }[];
}

export async function sha256(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** «1,677,679» / «-84,900» -> número con signo. */
export function montoMonefy(texto: string): number | null {
  const limpio = texto.replace(/,/g, '').trim();
  if (!/^-?\d+(\.\d+)?$/.test(limpio)) return null;
  return Math.round(Number(limpio));
}

/**
 * Lee el CSV de Monefy. Se usa header:false y se mapea por índice, porque la cabecera repite `currency`:
 * date,account,category,amount,currency,converted amount,currency,description
 */
export async function parsearMonefy(texto: string): Promise<ResultadoParseo> {
  const limpio = texto.replace(/^﻿/, '');
  const { data } = Papa.parse<string[]>(limpio, { header: false, skipEmptyLines: true });
  const filas: FilaMonefy[] = [];
  const invalidas: ResultadoParseo['invalidas'] = [];
  const ocurrencias = new Map<string, number>();

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    const linea = i + 1;
    if (i === 0 && r[0]?.trim().toLowerCase() === 'date') continue;
    if (r.length < 4) {
      invalidas.push({ linea, motivo: 'Faltan columnas.' });
      continue;
    }
    const fecha = fechaDesdeDMY(r[0]);
    const firmado = montoMonefy(r[3]);
    const cuenta = r[1].trim();
    const categoria = r[2].trim();
    if (!fecha) invalidas.push({ linea, motivo: `Fecha no válida: «${r[0]}».` });
    else if (firmado === null) invalidas.push({ linea, motivo: `Monto no válido: «${r[3]}».` });
    else if (firmado === 0) invalidas.push({ linea, motivo: 'El monto es cero.' });
    else if (!cuenta || !categoria) invalidas.push({ linea, motivo: 'Falta la cuenta o la categoría.' });
    else {
      const descripcion = r[7] ?? '';
      const clave = `${fecha}|${cuenta}|${categoria}|${firmado}|${descripcion}`;
      const n = (ocurrencias.get(clave) ?? 0) + 1;
      ocurrencias.set(clave, n);
      filas.push({
        linea,
        fecha,
        cuenta,
        categoria,
        kind: firmado < 0 ? 'expense' : 'income',
        monto: Math.abs(firmado),
        descripcion,
        ocurrencia: n,
        hash: await sha256(`${clave}|${n}`),
        posiblePrestamo: /prest[eé]/i.test(descripcion),
      });
    }
  }
  return { filas, invalidas };
}

export interface PlanImportacion {
  nuevas: FilaMonefy[];
  duplicadas: FilaMonefy[];
  cuentasFaltantes: string[];
  categoriasFaltantes: { nombre: string; kind: CategoryKind }[];
  posiblesPrestamos: FilaMonefy[];
}

const norm = (s: string) => s.trim().toLowerCase();

/** Vista previa: qué es nuevo, qué ya existe (por hash) y qué cuentas y categorías habría que crear. */
export function planificarImportacion(
  filas: FilaMonefy[],
  cuentas: { name: string }[],
  categorias: { name: string; kind: string }[],
  hashesExistentes: Set<string>,
): PlanImportacion {
  const nombresCuenta = new Set(cuentas.map((c) => norm(c.name)));
  const claveCategoria = new Set(categorias.map((c) => `${norm(c.name)}|${c.kind}`));
  const cuentasFaltantes = new Map<string, string>();
  const categoriasFaltantes = new Map<string, { nombre: string; kind: CategoryKind }>();

  for (const f of filas) {
    if (!nombresCuenta.has(norm(f.cuenta))) cuentasFaltantes.set(norm(f.cuenta), f.cuenta);
    const clave = `${norm(f.categoria)}|${f.kind}`;
    if (!claveCategoria.has(clave)) categoriasFaltantes.set(clave, { nombre: f.categoria, kind: f.kind });
  }
  const duplicadas = filas.filter((f) => hashesExistentes.has(f.hash));
  const nuevas = filas.filter((f) => !hashesExistentes.has(f.hash));
  return {
    nuevas,
    duplicadas,
    cuentasFaltantes: [...cuentasFaltantes.values()],
    categoriasFaltantes: [...categoriasFaltantes.values()],
    posiblesPrestamos: nuevas.filter((f) => f.posiblePrestamo),
  };
}
