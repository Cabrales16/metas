import { PostgrestError } from '@supabase/supabase-js';

import { traducirErrorDb } from './db-errors';

const error = (code: string, message = ''): PostgrestError => ({
  name: 'PostgrestError',
  code,
  message,
  details: '',
  hint: '',
  toJSON: () => ({ name: 'PostgrestError', code, message, details: '', hint: '' }),
});

describe('traducirErrorDb', () => {
  it('devuelve el mensaje de duplicado en una violación UNIQUE', () => {
    expect(traducirErrorDb(error('23505'), 'Ya existe.')).toBe('Ya existe.');
  });

  it('avisa de falta de permisos', () => {
    expect(traducirErrorDb(error('42501'), 'x')).toContain('No tienes permiso');
  });

  it('detecta un fallo de red', () => {
    expect(traducirErrorDb(error('', 'TypeError: Failed to fetch'), 'x')).toContain('No hay conexión');
  });

  it('usa un mensaje genérico para el resto', () => {
    expect(traducirErrorDb(error('23514', 'check'), 'x')).toBe(
      'No se pudo completar la operación. Inténtalo de nuevo.',
    );
  });
});
