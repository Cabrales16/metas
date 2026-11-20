const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** $ 1.860.000 (COP sin decimales). */
export function cop(valor: number): string {
  return COP.format(Math.round(valor));
}

/** Con signo explícito: +$ 1.000 / -$ 1.000. El signo vive en el texto, no solo en el color. */
export function copConSigno(valor: number): string {
  const redondeado = Math.round(valor);
  if (redondeado === 0) return cop(0);
  return (redondeado > 0 ? '+' : '-') + COP.format(Math.abs(redondeado));
}

/** Acepta «50.000», «50000», «$ 50.000» o «1.234,5» y devuelve un entero, o null si no es válido. */
export function parseMonto(texto: string): number | null {
  let t = texto.replace(/[\s$]/g, '');
  if (!t) return null;
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  else if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Math.round(parseFloat(t));
  return Number.isFinite(n) ? n : null;
}

/** 0.125 -> «12,50 %». */
export function porcentaje(fraccion: number, decimales = 2): string {
  return (
    (fraccion * 100).toLocaleString('es-CO', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }) + ' %'
  );
}
