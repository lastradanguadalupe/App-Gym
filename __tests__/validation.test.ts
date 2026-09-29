import { validatePassword, PASSWORD_MIN_LENGTH } from '@/lib/validation';

describe('validatePassword', () => {
  it('rechaza contrasenas mas cortas que el minimo', () => {
    const result = validatePassword('a1b2c3');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain(String(PASSWORD_MIN_LENGTH));
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

  it('el mensaje siempre es texto en castellano, nunca el error crudo', () => {
    const r = validatePassword('corta1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/contraseña/i);
  });
});
