import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { monthMatrix, toIsoDate } from '@/lib/calendar';

type Props = {
  /** 0-based, como `Date.getMonth()`. */
  month: number;
  year: number;
  /** Días con entrenamiento completado, como `YYYY-MM-DD`. */
  trainedDays: ReadonlySet<string>;
  /** Hoy, para marcar el día actual y atenuar el futuro. */
  today?: Date;
  selectedDay?: string | null;
  onSelectDay?: (iso: string) => void;
  /** Encabezados de la semana, de domingo a sábado. */
  weekdayLabels: readonly string[];
  /** Etiqueta legible del día, p. ej. "12 de marzo". */
  formatDayLabel: (iso: string) => string;
  /** Fechas `YYYY-MM-DD` fuera de `[minIso, maxIso]` se atenúan y no se pueden tocar. */
  minIso?: string;
  maxIso?: string;
};

/**
 * Grilla mensual de asistencia, dibujada con `View` y `Pressable`.
 *
 * No se usa una librería de calendario porque no hay nada que Calendar de RN
 * no sepa hacer: lo único variable es qué días tienen sesión completada, y eso
 * ya viene como un set. La geometría de la grilla vive en `lib/calendar.ts`.
 */
export function MonthCalendar({
  month,
  year,
  trainedDays,
  today = new Date(),
  selectedDay = null,
  onSelectDay,
  weekdayLabels,
  formatDayLabel,
  minIso,
  maxIso,
}: Props) {
  const theme = useTheme();
  const weeks = monthMatrix({ year, month });
  const todayIso = toIsoDate(today);
  const selectable = Boolean(onSelectDay);

  return (
    <View style={styles.wrap}>
      <View style={styles.week}>
        {weekdayLabels.map((label) => (
          <ThemedText key={label} type="smallBold" themeColor="textMuted" style={styles.weekday}>
            {label}
          </ThemedText>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.week}>
          {week.map((day, dayIndex) => {
            if (day === null) return <View key={dayIndex} style={styles.cell} />;

            const iso = toIsoDate(new Date(year, month, day));
            const trained = trainedDays.has(iso);
            const isToday = iso === todayIso;
            const isSelected = iso === selectedDay;
            // El futuro no se atenúa si también entrenaste: esa marca es real.
            const isFuture = !trained && iso > todayIso;
            const outOfRange =
              (minIso != null && iso < minIso) || (maxIso != null && iso > maxIso);
            const disabled = !selectable || outOfRange;

            return (
              <Pressable
                key={dayIndex}
                onPress={selectable && !outOfRange ? () => onSelectDay?.(iso) : undefined}
                disabled={disabled}
                accessibilityRole={selectable ? 'button' : 'text'}
                accessibilityLabel={formatDayLabel(iso)}
                accessibilityState={{ selected: isSelected, disabled: outOfRange || undefined }}
                style={styles.cell}>
                <View
                  style={[
                    styles.day,
                    isToday && { borderColor: theme.primary },
                    trained && {
                      backgroundColor: theme.accent,
                      borderColor: theme.accent,
                    },
                    isSelected && {
                      backgroundColor: theme.accentSubtle,
                      borderColor: theme.accent,
                    },
                  ]}>
                  <ThemedText
                    type={trained || isSelected ? 'smallBold' : 'small'}
                    style={{
                      color: trained || isSelected ? theme.onAccent : theme.textSecondary,
                      opacity: isFuture || outOfRange ? 0.35 : 1,
                    }}>
                    {day}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  cell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  day: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 40,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
});