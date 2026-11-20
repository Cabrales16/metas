import { COLOR_POR_DEFECTO, colorDe, etiquetaBolsa, etiquetaTipoCuenta, porNombre } from './catalog';

describe('catalog', () => {
  it('usa un color por defecto cuando no hay color', () => {
    expect(colorDe(null)).toBe(COLOR_POR_DEFECTO);
    expect(colorDe('#ef4444')).toBe('#ef4444');
  });

  it('traduce tipos de cuenta y bolsas', () => {
    expect(etiquetaTipoCuenta('savings')).toBe('Ahorros');
    expect(etiquetaBolsa('fijos')).toBe('Fijos');
    expect(etiquetaBolsa(null)).toBe('');
  });

  it('ordena por nombre en español sin distinguir tildes ni mayúsculas', () => {
    const lista = [{ name: 'Salud' }, { name: 'ahorro' }, { name: 'Ñandú' }, { name: 'Árbol' }];
    expect(lista.sort(porNombre).map((x) => x.name)).toEqual(['ahorro', 'Árbol', 'Ñandú', 'Salud']);
  });
});
