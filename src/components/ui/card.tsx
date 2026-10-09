import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  children: ReactNode;
  padded?: boolean;
  style?: object;
  tone?: 'surface' | 'elevated' | 'brand' | 'flat';
};

/**
 * Tarjeta base. El `tone` elige la superficie de la rampa neutra, salvo `brand`
 * que usa la única superficie teñida del sistema (`surfaceBrand` + borde
 * `primaryBorder`) para lo que merece destacarse: la cita de la pantalla de
 * inicio y las cabeceras de rutina.
 */
export function Card({ children, padded = true, style, tone = 'surface' }: Props) {
  const theme = useTheme();

  const surfaces = {
    surface: { bg: theme.surface, edge: theme.border, raised: true },
    elevated: { bg: theme.surfaceElevated, edge: theme.border, raised: true },
    brand: { bg: theme.surfaceBrand, edge: theme.primaryBorder, raised: false },
    flat: { bg: theme.background, edge: theme.border, raised: false },
  } as const;

  const { bg, edge, raised } = surfaces[tone];

  return (
    <View
      style={StyleSheet.flatten([
        styles.card,
        raised && styles.raised,
        { backgroundColor: bg, borderColor: edge, borderWidth: StyleSheet.hairlineWidth },
        padded && styles.padded,
        style,
      ])}>
      {children}
    </View>
  );
}

/**
 * Tarjeta de estadística: ícono + número grande + rótulo.
 *
 * Un SOLO tratamiento para todas, sin prop de color: los indicadores de una
 * misma fila ("Tu progreso") miden lo mismo, así que pintar uno de verde sería
 * inventar una jerarquía que el dato no tiene. El chip usa el teñido de
 * `primary` y el valor `textPrimary`; el verde queda para estados positivos
 * reales (entrenamiento completado, sesión en curso).
 */
export function StatCard({
  icon,
  value,
  label,
}: {
  icon: IconName;
  value: string;
  label: string;
}) {
  const theme = useTheme();

  return (
    <Card style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: theme.primarySubtle, borderColor: theme.primaryBorder }]}>
        <MaterialCommunityIcons name={icon} size={20} color={theme.primaryBright} />
      </View>
      <ThemedText type="title" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Card>
  );
}

export function Row({
  children,
  between,
  style,
}: {
  children: ReactNode;
  between?: boolean;
  style?: object;
}) {
  const theme = useTheme();
  return (
    <View
      style={StyleSheet.flatten([
        styles.row,
        between && { justifyContent: 'space-between' },
        { borderColor: theme.border },
        style,
      ])}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  raised: {
    ...Shadows.card,
  },
  padded: { padding: Spacing.three },
  stat: { flex: 1, gap: Spacing.two, alignItems: 'flex-start' },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { lineHeight: 34 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

export type { ViewStyle };
