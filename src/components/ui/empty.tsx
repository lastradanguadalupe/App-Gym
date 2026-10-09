import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  subtitle?: string;
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
};

/**
 * Estado vacío: "todavía no hay nada acá". No es un progreso ni un error, así
 * que usa la tarjeta neutra (`surface`) con el chip de ícono teñido de
 * `primary`: el mismo tratamiento que las estadísticas y los badges de la
 * pantalla de inicio. El verde queda para lo que sí es avance.
 */
export function EmptyState({ title, subtitle, icon = 'dumbbell' }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.icon, { backgroundColor: theme.primarySubtle, borderColor: theme.primaryBorder }]}>
        <MaterialCommunityIcons name={icon} size={28} color={theme.primaryBright} />
      </View>
      <ThemedText type="subtitle" style={styles.center}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
    ...Shadows.card,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  center: { textAlign: 'center' },
});
