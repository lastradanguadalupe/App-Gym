import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
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
          <ThemedText style={[styles.label, { color: fg }]}>{label}</ThemedText>
        </View>
      )}
    </Pressable>
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
  },
  full: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  inert: { opacity: 0.45 },
});
