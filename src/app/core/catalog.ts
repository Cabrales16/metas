import { Enums, Tables } from './database.types';

export type Account = Tables<'accounts'>;
export type Category = Tables<'categories'>;
export type AccountType = Enums<'account_type'>;
export type Bucket = Enums<'budget_bucket'>;
/** Las categorías solo pueden ser de ingreso o de gasto (CHECK en BD). */
export type CategoryKind = 'income' | 'expense';

export const COLOR_POR_DEFECTO = '#64748b';

export const COLORES = [
  { hex: '#3b82f6', nombre: 'Azul' },
  { hex: '#22c55e', nombre: 'Verde' },
  { hex: '#f59e0b', nombre: 'Ámbar' },
  { hex: '#ef4444', nombre: 'Rojo' },
  { hex: '#a855f7', nombre: 'Violeta' },
  { hex: '#14b8a6', nombre: 'Turquesa' },
  { hex: '#ec4899', nombre: 'Rosa' },
  { hex: '#f97316', nombre: 'Naranja' },
  { hex: '#eab308', nombre: 'Amarillo' },
  { hex: '#64748b', nombre: 'Gris' },
];

export const TIPOS_CUENTA: { valor: AccountType; etiqueta: string; icono: string }[] = [
  { valor: 'cash', etiqueta: 'Efectivo', icono: 'payments' },
  { valor: 'savings', etiqueta: 'Ahorros', icono: 'savings' },
  { valor: 'checking', etiqueta: 'Corriente', icono: 'account_balance' },
  { valor: 'wallet', etiqueta: 'Billetera digital', icono: 'account_balance_wallet' },
  { valor: 'investment', etiqueta: 'Inversión', icono: 'trending_up' },
];

export const BOLSAS: { valor: Bucket; etiqueta: string }[] = [
  { valor: 'ahorro', etiqueta: 'Ahorro' },
  { valor: 'fijos', etiqueta: 'Fijos' },
  { valor: 'gustos', etiqueta: 'Gustos' },
  { valor: 'regalos', etiqueta: 'Regalos' },
];

/** Íconos de Material Symbols disponibles para categorías (incluye los de las categorías base). */
export const ICONOS_CATEGORIA = [
  'savings', 'home', 'call', 'receipt_long', 'spa', 'medical_services', 'local_taxi',
  'directions_bus', 'shopping_basket', 'sports_esports', 'restaurant', 'checkroom', 'redeem',
  'trending_up', 'payments', 'shopping_cart', 'local_cafe', 'fastfood', 'school',
  'fitness_center', 'pets', 'flight', 'directions_car', 'two_wheeler', 'movie', 'music_note',
  'wifi', 'bolt', 'water_drop', 'phone_iphone', 'child_care', 'volunteer_activism', 'work',
  'account_balance', 'credit_card', 'medication', 'local_gas_station', 'build', 'category',
];

export function colorDe(color: string | null): string {
  return color ?? COLOR_POR_DEFECTO;
}

export function etiquetaTipoCuenta(tipo: AccountType): string {
  return TIPOS_CUENTA.find((t) => t.valor === tipo)?.etiqueta ?? tipo;
}

export function iconoTipoCuenta(tipo: AccountType): string {
  return TIPOS_CUENTA.find((t) => t.valor === tipo)?.icono ?? 'account_balance_wallet';
}

export function etiquetaBolsa(bolsa: Bucket | null): string {
  return BOLSAS.find((b) => b.valor === bolsa)?.etiqueta ?? '';
}

/** Orden alfabético en español, sin distinguir mayúsculas ni tildes. */
export function porNombre<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
}
