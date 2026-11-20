import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';

import { traducirErrorAuth } from './auth.service';

describe('traducirErrorAuth', () => {
  it('traduce credenciales inválidas', () => {
    const error = new AuthApiError('Invalid login credentials', 400, 'invalid_credentials');
    expect(traducirErrorAuth(error)).toBe('Correo o contraseña incorrectos.');
  });

  it('traduce el exceso de intentos', () => {
    const error = new AuthApiError('rate limit', 429, 'over_request_rate_limit');
    expect(traducirErrorAuth(error)).toContain('Demasiados intentos');
  });

  it('traduce un fallo de red', () => {
    const error = new AuthRetryableFetchError('Failed to fetch', 0);
    expect(traducirErrorAuth(error)).toContain('No hay conexión');
  });

  it('usa un mensaje genérico para errores desconocidos', () => {
    const error = new AuthApiError('algo raro', 500, 'unexpected_failure');
    expect(traducirErrorAuth(error)).toBe('No se pudo iniciar sesión. Inténtalo de nuevo.');
  });
});
