import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { gradientStyle, Gradients, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  variant?: Variant;
  label: string;
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: PressableProps['style'];
};

export function Button({
  variant = 'primary',
  label,
  icon,
  loading,
  disabled,
  full,
  style,
  ...rest
}: Props) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';

  /**
   * `primary` es LA acción principal de la pantalla y la única que lleva el
   * azul de marca plein: relleno `primary` (con degradado del mismo azul) y
   * texto `onPrimary`. `secondary` y `outline` bajan a la superficie teñida y al
   * texto aclarado para no competir con ella.
   */
  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: theme.primary, fg: theme.onPrimary },
    secondary: { bg: theme.surfaceBrand, fg: theme.primaryBright, border: theme.border },
    outline: { bg: 'transparent', fg: theme.primaryBright, border: theme.borderStrong },
    ghost: { bg: 'transparent', fg: theme.textSecondary },
    danger: { bg: theme.danger, fg: theme.onDanger },
  };

  const { bg, fg, border } = palette[variant];
  const userStyle = typeof style === 'function' ? style({ pressed: false, hovered: false }) : style;
  const isInert = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        full && styles.full,
        { backgroundColor: bg },
        border ? { borderColor: border, borderWidth: 1.5 } : null,
        isPrimary && !isInert && Shadows.raised,
        isPrimary && gradientStyle(Gradients.accent),
        pressed && styles.pressed,
        isInert && styles.inert,
        userStyle,
      ]}
      disabled={isInert}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <MaterialCommunityIcons name={icon} size={18} color={fg} /> : null}
          <ThemedText
            style={[styles.label, { color: fg }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {label}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Ancho por debajo del cual una fila de botones se apila en vez de repartirse
 * el ancho. Dos botones con `flex: 1` en un teléfono (320–430 px) no entran
 * cuando el texto es largo ("Marcar completo", "Catálogo de ejercicios"): cada
 * uno se queda con muy poco ancho y el texto se sale de su caja. Apilados, cada
 * botón toma todo el ancho y el ícono y el texto entran completos.
 */
export const BUTTON_ROW_STACK_WIDTH = 560;

/**
 * Fila de botones de acción que se apila en pantallas angostas.
 *
 * Usar en lugar de un `View` con `flexDirection: 'row'` para cualquier fila de
 * botones: en un teléfono o en una ventana web angosta los apila, y en pantallas
 * anchas los reparte por igual. Ver `BUTTON_ROW_STACK_WIDTH`.
 */
export function ButtonRow({
  children,
  style,
  testID,
}: {
  children: ReactNode;
  style?: ViewStyle;
  testID?: string;
}) {
  const { width } = useWindowDimensions();
  const stacked = width < BUTTON_ROW_STACK_WIDTH;

  return (
    <View testID={testID} style={[styles.buttonRow, stacked && styles.buttonRowStacked, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 52,
    minWidth: 0,
  },
  full: { alignSelf: 'stretch' },
  /** `flexShrink` + `minWidth: 0`: el contenido baja de su ancho de texto si
   *  hace falta, así el ícono nunca queda pegado al borde ni el texto se sale. */
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexShrink: 1, minWidth: 0 },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
    flexShrink: 1,
  },
  buttonRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'stretch' },
  buttonRowStacked: { flexDirection: 'column' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  inert: { opacity: 0.45 },
});
