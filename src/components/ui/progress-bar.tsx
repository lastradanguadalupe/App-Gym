import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Barra de progreso con etiqueta y porcentaje.
 *
 * El relleno es `primary` y no `accent`: el accent está reservado para avance
 * físico (entrenamientos completados), y esto es identidad de perfil.
 */
export function ProgressBar({
  percent,
  label,
  hint,
}: {
  /** 0–100. Se acota acá: un valor fuera de rango rompería el ancho del relleno. */
  percent: number;
  label: string;
  hint?: string;
}) {
  const theme = useTheme();
  const value = Math.min(100, Math.max(0, Math.round(percent)));

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="primaryBright">
          {value}%
        </ThemedText>
      </View>

      <View
        style={[styles.track, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: value }}>
        <View style={[styles.fill, { width: `${value}%`, backgroundColor: theme.primary }]} />
      </View>

      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: {
    height: 10,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: Radius.pill },
});