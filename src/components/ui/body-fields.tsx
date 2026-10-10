import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { WheelPicker } from '@/components/ui/wheel-picker';
import { Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  ALTURA_SUGERIDA,
  PESO_SUGERIDO,
  alturaLabel,
  alturaOptions,
  pesoLabel,
  pesoOptions,
  sexoOptions,
  withExactValue,
} from '@/lib/body-profile';
import type { Idioma, Sexo } from '@/types';

/** Rótulo + control + texto de ayuda, con el espaciado del formulario. */
export function WheelField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      {children}
      {hint ? (
        <ThemedText type="small" themeColor="textMuted">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

/**
 * Rueda obligatoria "sin elegir": mientras `value` es `null` muestra el valor
 * sugerido atenuado y un texto que invita a tocarla. El primer gesto la confirma.
 */
function requiredHint(value: number | string | null): string | undefined {
  return value == null ? t('onboarding.tocaParaElegir') : undefined;
}

export function SexoField({
  label,
  value,
  onChange,
  locale,
}: {
  label: string;
  value: Sexo | null;
  onChange: (value: Sexo | null) => void;
  locale: Idioma;
}) {
  const options = sexoOptions(locale);
  return (
    <WheelField label={label} hint={requiredHint(value)}>
      <WheelPicker<Sexo>
        label={label}
        options={options}
        value={value}
        onChange={onChange}
        suggestedValue="femenino"
      />
    </WheelField>
  );
}

export function WeightField({
  label,
  value,
  onChange,
  locale,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  locale: Idioma;
}) {
  return (
    <WheelField label={label} hint={requiredHint(value)}>
      <WheelPicker
        label={label}
        options={withExactValue(pesoOptions(locale), value, (v) => pesoLabel(locale, v))}
        value={value}
        onChange={onChange}
        suggestedValue={PESO_SUGERIDO}
      />
    </WheelField>
  );
}

export function HeightField({
  label,
  value,
  onChange,
  locale,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  locale: Idioma;
}) {
  return (
    <WheelField label={label} hint={requiredHint(value)}>
      <WheelPicker
        label={label}
        options={withExactValue(alturaOptions(locale), value, (v) => alturaLabel(locale, v))}
        value={value}
        onChange={onChange}
        suggestedValue={ALTURA_SUGERIDA}
      />
    </WheelField>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.two },
});
