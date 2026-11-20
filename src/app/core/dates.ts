// Las fechas se manejan como texto yyyy-MM-dd (columnas `date`). Nunca new Date('yyyy-MM-dd') para mostrar:
// se interpreta como UTC y en Bogotá muestra el día anterior.

const ZONA = 'America/Bogota';

/** Hoy en Bogotá, como yyyy-MM-dd. */
export function hoy(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(ahora);
}

/** Hora (0-23) en Bogotá, para el saludo. */
export function horaBogota(ahora: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, hour: '2-digit', hour12: false }).format(ahora),
  ) % 24;
}

const utc = (f: string) => {
  const [y, m, d] = f.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d ?? 1));
};

export const mesDe = (fecha: string): string => fecha.slice(0, 7);

export function rangoMes(ym: string): { desde: string; hasta: string } {
  const [y, m] = ym.split('-').map(Number);
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { desde: `${ym}-01`, hasta: `${ym}-${String(ultimo).padStart(2, '0')}` };
}

export function sumarMeses(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function sumarDias(fecha: string, n: number): string {
  const d = utc(fecha);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Días entre dos fechas (positivo si `b` es posterior). */
export function diasEntre(a: string, b: string): number {
  return Math.round((utc(b).getTime() - utc(a).getTime()) / 86_400_000);
}

/** Meses completos entre dos fechas. */
export function mesesEntre(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.max(0, (yb - ya) * 12 + (mb - ma) - (db < da ? 1 : 0));
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', ...opts });
const FMT_MES = fmt({ month: 'long', year: 'numeric' });
const FMT_CORTA = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
const FMT_DIA = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const FMT_MES_CORTO = fmt({ month: 'short' });

export const etiquetaMes = (ym: string): string => FMT_MES.format(utc(`${ym}-01`));
export const mesCorto = (ym: string): string => FMT_MES_CORTO.format(utc(`${ym}-01`)).replace('.', '');
export const formatoFecha = (f: string): string => FMT_CORTA.format(utc(f)).replace(/\./g, '').replace(/ de /g, ' ');
export const formatoDia = (f: string): string => FMT_DIA.format(utc(f));

/** dd/MM/yyyy (Monefy) -> yyyy-MM-dd; null si no es una fecha válida. */
export function fechaDesdeDMY(texto: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const control = utc(iso);
  return control.getUTCMonth() + 1 === Number(mo) && control.getUTCDate() === Number(d) ? iso : null;
}
