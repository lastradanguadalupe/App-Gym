import { darken, lighten, mix, parseHex, toHex, withAlpha } from '@/lib/color';

describe('parseHex / toHex', () => {
  it('lee la notación de 6 dígitos', () => {
    expect(parseHex('#2D8CFF')).toEqual({ r: 45, g: 140, b: 255 });
  });

  it('lee la notación corta #RGB', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('no le importa el case ni los espacios', () => {
    expect(parseHex('  #2d8cff ')).toEqual({ r: 45, g: 140, b: 255 });
  });

  it('rechaza lo que no es un hex de 3 o 6 dígitos', () => {
    expect(() => parseHex('2D8CFF')).toThrow(/inválido/);
    expect(() => parseHex('#2D8C')).toThrow(/inválido/);
    expect(() => parseHex('rgba(45, 140, 255, 0.5)')).toThrow(/inválido/);
  });

  it('redondea y rellena con cero', () => {
    expect(toHex({ r: 0, g: 8, b: 255.6 })).toBe('#0008FF');
  });

  it('sale en mayúsculas, como los hex del tema', () => {
    expect(toHex(parseHex('#0a0a0a'))).toBe('#0A0A0A');
  });
});

describe('mix', () => {
  it('con amount 0 devuelve el origen y con 1 el destino', () => {
    expect(mix('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mix('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
  });

  it('interpola linealmente', () => {
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });

  it('acota amount fuera de rango en vez de extrapolar', () => {
    expect(mix('#000000', '#FFFFFF', -1)).toBe('#000000');
    expect(mix('#000000', '#FFFFFF', 2)).toBe('#FFFFFF');
  });
});

describe('darken / lighten', () => {
  // Todo token azul/verde de `src/constants/theme.ts` sale de acá: si estas
  // funciones se rompen, la rampa entera del tema se desalinea en silencio.
  const base = parseHex('#2D8CFF');

  it('darken es mix hacia negro', () => {
    expect(darken('#2D8CFF', 0.5)).toBe(mix('#2D8CFF', '#000000', 0.5));
  });

  it('lighten es mix hacia blanco', () => {
    expect(lighten('#2D8CFF', 0.5)).toBe(mix('#2D8CFF', '#FFFFFF', 0.5));
  });

  it('darken baja los tres canales y lighten los sube (misma proporción)', () => {
    const darker = parseHex(darken('#2D8CFF', 0.5));
    const lighter = parseHex(lighten('#2D8CFF', 0.5));

    expect(darker.r).toBeLessThan(base.r);
    expect(darker.g).toBeLessThan(base.g);
    expect(darker.b).toBeLessThan(base.b);

    // `>=` y no `>` porque el azul ya está al máximo y no tiene a dónde subir.
    expect(lighter.r).toBeGreaterThan(base.r);
    expect(lighter.g).toBeGreaterThan(base.g);
    expect(lighter.b).toBeGreaterThanOrEqual(base.b);
  });

  it('el extremo del canal ya saturado se queda donde estaba', () => {
    // El azul de #2D8CFF está al máximo: aclararlo no lo mueve, y oscurecerlo
    // solo lo baja a la mitad (255 * 0.5), no a cero de golpe.
    expect(parseHex(lighten('#2D8CFF', 0.5)).b).toBe(base.b);
    expect(parseHex(darken('#2D8CFF', 0.5)).b).toBe(128);
  });
});

describe('withAlpha', () => {
  it('devuelve rgba con los canales del hex', () => {
    expect(withAlpha('#2D8CFF', 0.12)).toBe('rgba(45, 140, 255, 0.12)');
  });

  it('acota la opacidad a 0–1', () => {
    expect(withAlpha('#2D8CFF', -1)).toBe('rgba(45, 140, 255, 0)');
    expect(withAlpha('#2D8CFF', 5)).toBe('rgba(45, 140, 255, 1)');
  });
});