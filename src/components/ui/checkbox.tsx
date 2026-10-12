import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Enlace de texto bajo el rótulo (p. ej. la Política de Privacidad). */
  linkLabel?: string;
  onLinkPress?: () => void;
  disabled?: boolean;
  testID?: string;
};

/**
 * Casilla de verificación accesible.
 *
 * Decisiones:
 *  * El área táctil del checkbox es de 44 px de alto como mínimo, con el
 *    recuadro pintado más chico para no romper la paleta.
 *  * El rótulo envuelve en varias líneas (`flexShrink` + sin `numberOfLines`):
 *    a 320 px los textos largos de consentimiento no se cortan.
 *  * El enlace NO va anidado dentro del `Pressable` que alterna: es una fila
 *    aparte. Así se puede tocar la política sin tildar la casilla por accidente,
 *    tanto en nativo como en web (donde el click de un ancla burbujearía al
 *    contenedor).
 *  * Nunca se pre-tilda desde acá: el estado lo controla siempre quien lo usa.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  linkLabel,
  onLinkPress,
  disabled,
  testID,
}: Props) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <Pressable
        testID={testID}
        onPress={() => onChange(!checked)}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled: !!disabled }}
        accessibilityLabel={label}
        style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}>
        <View
          style={[
            styles.box,
            checked
              ? { backgroundColor: theme.brand, borderColor: theme.brand }
              : { backgroundColor: 'transparent', borderColor: theme.borderStrong },
          ]}>
          {checked ? <MaterialCommunityIcons name="check" size={16} color={theme.tintText} /> : null}
        </View>
        <ThemedText type="small" style={styles.label}>
          {label}
        </ThemedText>
      </Pressable>

      {linkLabel && onLinkPress ? (
        <Pressable
          onPress={onLinkPress}
          accessibilityRole="link"
          accessibilityLabel={linkLabel}
          hitSlop={8}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
          <ThemedText type="small" themeColor="brandBright" style={styles.linkText}>
            {linkLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    // Área táctil ≥ 44 px aunque el recuadro sea más chico.
    minHeight: 44,
    paddingVertical: Spacing.one,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    // Centrado vertical del recuadro contra la primera línea del rótulo.
    marginTop: 1,
  },
  label: { flex: 1, flexShrink: 1, minWidth: 0 },
  link: { alignSelf: 'flex-start', marginLeft: 32, paddingVertical: Spacing.one },
  linkText: { textDecorationLine: 'underline' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
});
