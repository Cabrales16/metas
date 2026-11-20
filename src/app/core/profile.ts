/** App de un solo usuario: el nombre para el saludo vive aquí para cambiarlo en un solo lugar. */
export const NOMBRE_USUARIO = 'Andrés';

export function saludo(hora: number): string {
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
