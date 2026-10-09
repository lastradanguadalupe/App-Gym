/**
 * Utilidades para DERIVAR colores de un único valor base.
 *
 * La paleta de `src/constants/theme.ts` se arma con estas funciones para que
 * cada tono de una familia (el azul de marca, el verde de acento) sea
 * matemáticamente pariente de su base y no un hex elegido a ojo. Si algún día
 * se cambia `primary`, toda la rampa —superficies, bordes, chips, degradados—
 * se mueve junta.
 *
 * Solo se acepta notación hexadecimal (`#RGB` / `#RRGGBB`): es la que usan los
 * tokens del tema. Para transparencias está `withAlpha`, que devuelve `rgba()`
 * porque es lo que RN y react-native-web interpretan igual.
 */

export type Rgb = { r: number; g: number; b: number };

const SHORT_HEX = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const LONG_HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function channel(value: number): string {
  return Math.round(clamp(value, 0, 255))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
}

export function parseHex(hex: string): Rgb {
  const value = hex.trim();
  const short = SHORT_HEX.exec(value);
  if (short) {
    return {
      r: parseInt(short[1] + short[1], 16),
      g: parseInt(short[2] + short[2], 16),
      b: parseInt(short[3] + short[3], 16),
    };
  }
  const long = LONG_HEX.exec(value);
  if (long) {
    return {
      r: parseInt(long[1], 16),
      g: parseInt(long[2], 16),
      b: parseInt(long[3], 16),
    };
  }
  throw new Error(`Color hexadecimal inválido: "${hex}"`);
}

export function toHex({ r, g, b }: Rgb): string {
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/**
 * Interpola linealmente de `from` hacia `to`.
 * `amount` 0 devuelve `from`, 1 devuelve `to`; queda acotado a 0–1.
 */
export function mix(from: string, to: string, amount: number): string {
  const t = clamp(amount, 0, 1);
  const a = parseHex(from);
  const b = parseHex(to);
  return toHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

/** Oscurece hacia negro conservando el tono: sirve para bajar la saturación. */
export function darken(hex: string, amount: number): string {
  return mix(hex, '#000000', amount);
}

/** Aclara hacia blanco conservando el tono: sirve para texto e íconos sobre oscuro. */
export function lighten(hex: string, amount: number): string {
  return mix(hex, '#FFFFFF', amount);
}

/** Devuelve `rgba()` con la opacidad indicada (0–1) sobre el mismo color. */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${clamp(alpha, 0, 1)})`;
}