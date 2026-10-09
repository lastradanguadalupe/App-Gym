import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/context/i18n';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

type Props = {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function GoogleButton({ onPress, loading, disabled }: Props) {
  const theme = useTheme();
  useI18n();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
        (disabled || loading) && styles.dim,
      ]}>
      {loading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <View style={styles.badge}>
          <ThemedText type="smallBold" style={styles.g}>
            G
          </ThemedText>
        </View>
      )}
      <ThemedText style={styles.label}>{t('common.continuarConGoogle')}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    minHeight: 52,
    paddingHorizontal: Spacing.four,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4E9F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  g: { color: '#4285F4', fontSize: 14 },
  label: { fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  dim: { opacity: 0.5 },
});