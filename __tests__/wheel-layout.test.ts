import { Spacing } from '@/constants/theme';
import { WHEEL_MIN_ROW_WIDTH } from '@/lib/wheel';

/**
 * Guarda de layout de la fila `[−] [rueda] [+]`.
 *
 * Jest no calcula layout, así que en vez de renderizar (la rueda de peso tiene
 * 441 opciones y tarda decenas de segundos) se comprueba la aritmética: el ancho
 * útil dentro de la tarjeta tiene que alcanzar para la fila de la rueda. Es el
 * mismo enfoque que `button-row.test.tsx`.
 *
 * Cadena de anchos: `Screen` con padding usa `Spacing.four` a cada lado y `Card`
 * con padding usa `Spacing.three` a cada lado.
 */
const SCREEN_PADDING = Spacing.four * 2;
const CARD_PADDING = Spacing.three * 2;

function availableWidth(viewport: number): number {
  return viewport - SCREEN_PADDING - CARD_PADDING;
}

describe('ancho de la fila de la rueda', () => {
  it.each([320, 360, 390])('entra en un viewport de %ipx', (viewport) => {
    expect(availableWidth(viewport)).toBeGreaterThanOrEqual(WHEEL_MIN_ROW_WIDTH);
  });

  it('documenta el caso más ajustado: 320px deja 240px y la fila necesita 208px', () => {
    expect(availableWidth(320)).toBe(240);
    expect(WHEEL_MIN_ROW_WIDTH).toBe(208);
  });

  it('no entra en un viewport demasiado angosto, para que el test tenga sentido', () => {
    expect(availableWidth(280)).toBeLessThan(WHEEL_MIN_ROW_WIDTH);
  });
});
