import { t } from '@/i18n';
import { validatePassword, PASSWORD_MIN_LENGTH } from '@/lib/validation';

describe('validatePassword', () => {
  it('rechaza contrasenas mas cortas que el minimo', () => {
    const result = validatePassword('a1b2c3');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(t(result.key, { min: PASSWORD_MIN_LENGTH })).toContain(String(PASSWORD_MIN_LENGTH));
    }
  });

  it('rechaza una cadena vacia', () => {
    expect(validatePassword('').ok).toBe(false);
  });

  it('rechaza solo letras', () => {
    expect(validatePassword('abcdefgh').ok).toBe(false);
  });

  it('rechaza solo numeros', () => {
    expect(validatePassword('12345678').ok).toBe(false);
  });

  it('acepta letras y numeros con el largo minimo', () => {
    expect(validatePassword('abc12345').ok).toBe(true);
  });

  it('acepta simbolos y espacios sin quejosarse', () => {
    expect(validatePassword('Abc 123!@#').ok).toBe(true);
  });

  // Devuelve una clave, no un texto: el mismo chequeo tiene que servir para
  // ambos idiomas sin que la validacion sepa del locale.
  it('devuelve una clave de traduccion, no el error crudo', () => {
    const r = validatePassword('corta1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.key).toBe('ajustes.contrasenaMuyCorta');
  });

  it('la clave se traduce en ambos idiomas', () => {
    const r = validatePassword('corta1');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(t(r.key, { min: PASSWORD_MIN_LENGTH })).toMatch(/contraseña/i);
      expect(t(r.key, { locale: 'en', min: PASSWORD_MIN_LENGTH })).toMatch(/password/i);
    }
  });
});
