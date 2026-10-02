import '@/global.css';

import { Platform } from 'react-native';

/**
 * Marca AppGym — modo oscuro sobre negro profundo.
 *
 * El lienzo es `#0A0A0A` (negro profundo, no puro: evita el banding del gris
 * plano y deja margen a la sombra). Las superficies suben en una rampa NEUTRAL
 * (`backgroundElement` → `backgroundSelected`) para que las tarjetas se lean
 * como elevación y no como manchas de color.
 *
 * El color se reparte con disciplina: el negro domina y el azul/teal son
 * ACENTOS. El azul eléctrico (`brand`/`tint`) marca marca, navegación y
 * acciones; el teal (`teal`/`success`) queda reservado a progreso, logros y
 * estados positivos (días entrenados, sesión completada). Reparto aproximado:
 * 75 % negro/gris, 20 % azul, 5 % teal.
 *
 * Contraste sobre `#0A0A0A`: `text` 19:1, `textSecondary` 10:1, `muted` 5:1,
 * `brand` 5:4:1, `teal` 10:1, `danger` 6:5:1. `tintText` es oscuro a propósito:
 * el blanco sobre el azul de marca solo da 3:3:1.
 */
const dark = {
  // Marca — azul eléctrico
  brand: '#2D8CFF',
  brandBright: '#6BA8FF',
  brandDeep: '#0B1E38',
  brandSurface: '#13233D',
  brandSurfaceAlt: '#1B3355',

  // Semánticos
  text: '#FFFFFF',
  textSecondary: '#B4BCC8',
  muted: '#7C8593',
  background: '#0A0A0A',
  backgroundElement: '#15171A',
  backgroundSelected: '#212529',
  border: '#2A2E33',
  borderStrong: 'rgba(45, 140, 255, 0.55)',
  tint: '#2D8CFF',
  tintText: '#04101F',
  teal: '#20D9C0',
  success: '#20D9C0',
  onSuccess: '#032521',
  danger: '#FF5A6E',
  onDanger: '#2A0510',
  warning: '#FFB547',
  overlay: 'rgba(0, 0, 0, 0.72)',
} as const;

/** La app es de tema oscuro único: `light` es un alias para que `ThemeColor` siga siendo válido. */
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
 * `experimental_backgroundImage` requiere RN 0.76+.
 */
export const Gradients = {
  hero: 'linear-gradient(155deg, #0B2144 0%, #10346B 50%, #1A4B9E 100%)',
  accent: 'linear-gradient(135deg, #3D9BFF 0%, #1D6FE0 100%)',
  deep: 'linear-gradient(160deg, #0C0C0C 0%, #161616 100%)',
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
