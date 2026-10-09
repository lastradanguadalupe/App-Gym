import '@/global.css';

import { Platform } from 'react-native';

import { darken, lighten, mix, withAlpha } from '@/lib/color';

/**
 * Marca AppGym — modo oscuro sobre negro profundo.
 *
 * La paleta es un sistema cerrado: cada color tiene un ROL y sale de una de las
 * cinco familias de abajo. No hay hex sueltos en los componentes; si hace falta
 * un tono nuevo se deriva acá con `mix`/`darken`/`lighten`/`withAlpha` de una
 * base, nunca se eyeballea.
 *
 * Las familias:
 *
 * 1. NEUTROS — el 80 % de la pantalla.
 *    `background` lienzo, `surface` tarjeta normal, `surfaceElevated` un paso
 *    arriba para lo que destaca DENTRO de una tarjeta, `surfaceBrand` la única
 *    superficie con color (tarjeta de cita, botón secundario, estado vacío).
 *    Las superficies suben en una rampa neutra para que las tarjetas se lean
 *    como elevación y no como manchas de color.
 * 2. `primary` — UN solo azul de marca. Identidad y acción principal: hero,
 *    botón principal, tabs, íconos de statisticas. Toda la rampa azul
 *    (`primaryBright`, `primaryDeep`, `primarySubtle`, `surfaceBrand`) y los
 *    degradados salen de este hex.
 * 3. `accent` — UN solo verde. Progreso y estados positivos: sesión
 *    completada, sesión en curso, racha de la semana, tips, ícono de la cita.
 *    Nunca se usa para decorar.
 * 4. TEXTO — `textPrimary` para lo que se lee, `textSecondary` para subtítulos
 *    y descripciones, `textMuted` para lo accesorio.
 * 5. ESTADO — `danger`, `warning`, `onPrimary`/`onAccent` (texto sobre relleno).
 *
 * Regla de reparto: el negro domina y el color es acento (≈ 75 % negro/gris,
 * 20 % azul, 5 % verde). Si algo no es ni la acción principal ni un progreso,
 * va en neutro.
 *
 * Contraste sobre `#0A0A0A`: `textPrimary` 19.8:1, `textSecondary` 10.3:1,
 * `textMuted` 5.3:1, `primary` 5.9:1, `primaryBright` 9.2:1, `accent` 11:1,
 * `danger` 6.5:1. Sobre `surfaceBrand` el `primaryBright` da 6.4:1.
 * `onPrimary` es oscuro a propósito: el blanco sobre el azul de marca solo da
 * 3.3:1.
 */

/* 1. Neutros ---------------------------------------------------------- */
const background = '#0A0A0A';
const surface = '#15171A';
const surfaceElevated = '#212529';
const border = '#2A2E33';

/* 2. Texto ------------------------------------------------------------ */
const textPrimary = '#FFFFFF';
const textSecondary = '#B4BCC8';
const textMuted = '#7C8593';

/* 3. Azul de marca — el único azul de la app -------------------------- */
const primary = '#2D8CFF';
/** Texto e íconos sobre oscuro: el `primary` aclarado (9.2:1). */
const primaryBright = lighten(primary, 0.35);
/** Rellenos y bordes translúcidos con el azul de marca. */
const primarySubtle = withAlpha(primary, 0.12);
const primaryBorder = withAlpha(primary, 0.32);
/** Texto sobre relleno `primary`: oscuro a propósito. */
const onPrimary = '#04101F';

/* 4. Verde de acento — progreso y estados positivos ------------------- */
const accent = '#20D9C0';
const accentSubtle = withAlpha(accent, 0.12);
const accentBorder = withAlpha(accent, 0.28);
const onAccent = '#032521';

/* 5. Estado ----------------------------------------------------------- */
const danger = '#FF5A6E';
const onDanger = '#2A0510';
const warning = '#FFB547';
const overlay = 'rgba(0, 0, 0, 0.72)';

/* Derivados: se calculan a partir de las bases de arriba --------------- */
/** Superficie teñida de marca: la única superficie que usa color. */
const surfaceBrand = mix(surface, primary, 0.2);
/** Un paso más arriba que `surfaceBrand`: ripple/selección. */
const surfaceBrandElevated = mix(surface, primary, 0.32);
/** Tono más oscuro de la rampa: fallback sólido del hero y borde fuerte. */
const primaryDeep = darken(primary, 0.78);
const borderStrong = withAlpha(primary, 0.55);

/**
 * Paradas de los degradados de marca. Son las mismas cinco familias del ramp:
 * van del tono más profundo al más claro y solo se usan dentro de `Gradients`,
 * por eso no forman parte de `palette`.
 */
const primaryMid = darken(primary, 0.58);
const primaryShallow = darken(primary, 0.32);
const primaryLift = lighten(primary, 0.12);
const primaryDim = darken(primary, 0.18);

const palette = {
  background,
  surface,
  surfaceElevated,
  surfaceBrand,
  surfaceBrandElevated,
  border,
  borderStrong,

  textPrimary,
  textSecondary,
  textMuted,

  primary,
  primaryBright,
  primaryDeep,
  primarySubtle,
  primaryBorder,
  onPrimary,

  accent,
  accentSubtle,
  accentBorder,
  onAccent,

  danger,
  onDanger,
  warning,
  overlay,
} as const;

/**
 * Nombres viejos que siguen apuntando al sistema nuevo.
 *
 * Evitan romper las pantallas que todavía los usan (`theme.brand`, `theme.teal`,
 * `theme.backgroundElement`, ...) y al ser alias esas pantallas quedan dentro
 * de la paleta sin tener que tocarlas: heredan el valor derivado. No usar en
 * código nuevo: usar el nombre canónico de `palette`.
 */
const legacyAliases = {
  brand: primary,
  brandBright: primaryBright,
  brandDeep: primaryDeep,
  brandSurface: surfaceBrand,
  brandSurfaceAlt: surfaceBrandElevated,
  tint: primary,
  tintText: onPrimary,
  text: textPrimary,
  muted: textMuted,
  backgroundElement: surface,
  backgroundSelected: surfaceElevated,
  teal: accent,
  success: accent,
  onSuccess: onAccent,
} as const;

/** La app es de tema oscuro único: `light` es un alias para que `ThemeColor` siga siendo válido. */
const dark = { ...palette, ...legacyAliases } as const;

const light = dark;

export const Colors = {
  light,
  dark: light,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  md: 12,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Color de las sombras: en fondo negro la profundidad la dan la sombra y el borde fino. */
export const ShadowColor = '#000000';

/** Sombras discretas: en fondo negro la profundidad la dan la sombra y el borde fino. */
export const Shadows = {
  card: Platform.select({
    ios: {
      shadowColor: ShadowColor,
      shadowOpacity: 0.6,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 3 },
    default: {
      boxShadow: '0 10px 28px rgba(0, 0, 0, 0.7)',
    },
  }),
  raised: Platform.select({
    ios: {
      shadowColor: ShadowColor,
      shadowOpacity: 0.75,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 14 },
    },
    android: { elevation: 8 },
    default: {
      boxShadow: '0 14px 36px rgba(0, 0, 0, 0.8)',
    },
  }),
} as const;

/**
 * Degradados de marca. Sobre lienzo negro el azul se reserva para momentos de
 * marca (hero, acciones primarias) y como relleno degradado de superficies.
 *
 * No hay ningún hex suelto acá: cada parada sale de la rampa de `primary`, así
 * que el hero y el botón principal son el mismo azul en distinto tono.
 * `experimental_backgroundImage` requiere RN 0.76+.
 */
export const Gradients = {
  hero: `linear-gradient(155deg, ${primaryDeep} 0%, ${primaryMid} 50%, ${primaryShallow} 100%)`,
  accent: `linear-gradient(135deg, ${primaryLift} 0%, ${primaryDim} 100%)`,
  mark: `linear-gradient(180deg, ${primaryLift}, ${primaryDeep})`,
  deep: `linear-gradient(160deg, ${background} 0%, ${surface} 100%)`,
} as const;

/**
 * Aplica un degradado de `Gradients` como estilo de View/Pressable.
 * En native va como `experimental_backgroundImage`; en web react-native-web
 * solo entiende `backgroundImage`, así que el alias experimental se pierde y
 * el View queda transparente. Usar SIEMPRE junto a un `backgroundColor` sólido
 * de respaldo para que el contenido claro nunca quede ilegible.
 */
export function gradientStyle(gradient: string) {
  return Platform.OS === 'web'
    ? { backgroundImage: gradient }
    : { experimental_backgroundImage: gradient };
}

export const MaxContentWidth = 800;
