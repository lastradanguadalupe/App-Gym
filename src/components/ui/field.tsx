import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/context/i18n';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

type Props = TextInputProps & {
  label?: string;
  error?: string | null;
  hint?: string;
};

export function Field({ label, error, hint, secureTextEntry, style, ...rest }: Props) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  // El label de accesibilidad del toggle cambia con el idioma.
  useI18n();

  return (
    <View style={styles.wrap}>
      {label ? (
        <ThemedText type="smallBold" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
      <View
        style={[
          styles.inputBox,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: error ? theme.danger : focused ? theme.brand : theme.border,
          },
          focused && { borderWidth: 2 },
        ]}>
        <TextInput
          secureTextEntry={secureTextEntry && !visible}
          placeholderTextColor={theme.muted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            { color: theme.text, paddingRight: secureTextEntry ? 52 : Spacing.three },
            style,
          ]}
          {...rest}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={visible ? t('common.ocultarContrasena') : t('common.mostrarContrasena')}
            style={styles.toggle}>
            <MaterialCommunityIcons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <ThemedText type="small" style={styles.error} themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
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
  inputBox: {
    position: 'relative',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  input: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
    fontSize: 16,
    minHeight: 52,
  },
  toggle: { position: 'absolute', right: Spacing.md },
  error: { marginTop: -Spacing.one },
});
