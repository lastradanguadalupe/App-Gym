import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { IconName } from '@/components/ui/card';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Option = {
  value: string;
  label: string;
  icon?: IconName;
  description?: string;
};

type OptionCardsProps = {
  options: readonly Option[];
  value: string | null;
  onChange: (value: string) => void;
  /** `row` reparte en varias columnas; `column` usa cards grandes apiladas. */
  layout?: 'row' | 'column';
  accessibilityLabel?: string;
};

/**
 * Selector de opciones tipo cards/chips grandes, para lo que se elige tocando
 * en vez de tipeando (sexo, idioma, objetivo, experiencia).
 *
 * El acento de color se decide acá y no en cada pantalla: seleccionado usa
 * `brandSurface` + borde `borderStrong`, y el check confirma el estado. Cada
 * card es un `Pressable` con `accessibilityRole="radio"`, así que la lectura por
 * pantalla anuncia la selección en lugar de un botón pelado.
 */
export function OptionCards({
  options,
  value,
  onChange,
  layout = 'row',
  accessibilityLabel,
}: OptionCardsProps) {
  const theme = useTheme();

  return (
    <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={({ pressed }) => [
              styles.card,
              layout === 'row' ? styles.cardRow : styles.cardColumn,
              {
                backgroundColor: selected ? theme.brandSurface : theme.backgroundElement,
                borderColor: selected ? theme.borderStrong : theme.border,
                borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
              },
              selected && Shadows.card,
              pressed && styles.pressed,
            ]}>
            {option.icon ? (
              <View
                style={[
                  styles.icon,
                  { backgroundColor: selected ? `${theme.brand}22` : 'transparent' },
                ]}>
                <MaterialCommunityIcons
                  name={option.icon}
                  size={20}
                  color={selected ? theme.brandBright : theme.muted}
                />
              </View>
            ) : null}

            <View style={styles.text}>
              <ThemedText
                type="smallBold"
                style={{ color: selected ? theme.text : theme.textSecondary }}>
                {option.label}
              </ThemedText>
              {option.description ? (
                <ThemedText type="small" themeColor="muted">
                  {option.description}
                </ThemedText>
              ) : null}
            </View>

            {selected ? (
              <MaterialCommunityIcons name="check-circle" size={20} color={theme.brandBright} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Stepper de enteros: botones −/+ más un riel de chips.
 *
 * Para "días disponibles por semana" (1 a 7). Los chips dejan ver el rango
 * completo y elegir de un toque, en vez de contar de a uno; los botones quedan
 * para el ajuste fino. Los dos caminos mueven el mismo estado.
 */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 7,
  options,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  options?: readonly number[];
  label?: string;
}) {
  const theme = useTheme();
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <View style={styles.stepperWrap} accessibilityLabel={label}>
      <View style={styles.stepperRow}>
        <Pressable
          onPress={() => onChange(clamp(value - 1))}
          disabled={value <= min}
          accessibilityRole="button"
          accessibilityLabel="Restar"
          style={({ pressed }) => [
            styles.stepButton,
            { borderColor: theme.border, backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
            value <= min && styles.disabled,
          ]}>
          <MaterialCommunityIcons name="minus" size={22} color={value <= min ? theme.muted : theme.text} />
        </Pressable>

        <View style={styles.valueBox}>
          <ThemedText type="title" style={styles.valueText}>
            {value}
          </ThemedText>
        </View>

        <Pressable
          onPress={() => onChange(clamp(value + 1))}
          disabled={value >= max}
          accessibilityRole="button"
          accessibilityLabel="Sumar"
          style={({ pressed }) => [
            styles.stepButton,
            { borderColor: theme.border, backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
            value >= max && styles.disabled,
          ]}>
          <MaterialCommunityIcons name="plus" size={22} color={value >= max ? theme.muted : theme.text} />
        </Pressable>
      </View>

      {options ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          {options.map((option) => {
            const selected = option === value;
            return (
              <Pressable
                key={option}
                onPress={() => onChange(option)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={String(option)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: selected ? theme.tint : 'transparent',
                    borderColor: selected ? theme.tint : theme.border,
                  },
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{ color: selected ? theme.tintText : theme.textSecondary }}>
                  {option}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
  },
  cardRow: { flexGrow: 1, flexBasis: 0, minWidth: 140 },
  cardColumn: { flexBasis: '100%', paddingVertical: Spacing.three },
  icon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.4 },

  stepperWrap: { gap: Spacing.two },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepButton: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueBox: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  valueText: { fontSize: 30, lineHeight: 34 },
  chipRow: { gap: Spacing.two, paddingTop: Spacing.two },
  chip: {
    minWidth: 44,
    height: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});