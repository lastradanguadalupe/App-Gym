import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { gradientStyle, Gradients, Radius, Shadows, Spacing } from '@/constants/theme';
import { useI18n } from '@/context/i18n';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

type Props = {
  title: string;
  subtitle: string;
};

export function AuthHeader({ title, subtitle }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={[styles.mark, { backgroundColor: theme.brandBright }, gradientStyle(Gradients.accent)]}>
          <MaterialCommunityIcons name="dumbbell" size={18} color="#FFFFFF" />
        </View>
        <ThemedText type="eyebrow" themeColor="brandBright">
          AppGym
        </ThemedText>
      </View>
      <ThemedText type="display">{title}</ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        {subtitle}
      </ThemedText>
    </View>
  );
}

export function AuthDivider({ label }: { label?: string }) {
  const theme = useTheme();
  // Se suscribe al idioma para que el separador cambie al elegir otro.
  useI18n();

  return (
    <View style={styles.divider}>
      <View style={[styles.line, { backgroundColor: theme.border }]} />
      <ThemedText type="small" themeColor="textSecondary">
        {label ?? t('common.oConTuEmail')}
      </ThemedText>
      <View style={[styles.line, { backgroundColor: theme.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.two },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  mark: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
});
