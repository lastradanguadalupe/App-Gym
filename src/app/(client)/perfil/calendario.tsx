import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { MonthCalendar } from '@/components/ui/month-calendar';
import { Screen, Section } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/context/i18n';
import { useSession } from '@/context/session';
import { useTheme } from '@/hooks/use-theme';
import {
  countTrainedInMonth,
  isCurrentMonth,
  shiftMonth,
  trainedDays,
  type Mes,
} from '@/lib/calendar';
import { fetchSessionDays } from '@/lib/db';
import { calendar, formatLongDate, monthTitle, t } from '@/i18n';

/**
 * Calendario de asistencia.
 *
 * Un día está entrenado si tiene al menos una fila en `workout_sessions`: dos
 * entrenamientos el mismo día siguen siendo un día entrenado, que es lo que el
 * calendario comunica. El resumen cuenta días, no sesiones.
 *
 * La geometría de la grilla y el conteo salen de `lib/calendar.ts`; acá solo se
 * pinta la grilla y se navega entre meses. No se puede avanzar al mes siguiente
 * cuando ya se está en el actual: no hay nada que registrar todavía.
 */

export default function CalendarioScreen() {
  const theme = useTheme();
  const { locale } = useI18n();
  const { session } = useSession();

  const today = new Date();
  const [mes, setMes] = useState<Mes>({ year: today.getFullYear(), month: today.getMonth() });
  const [days, setDays] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);

  const uid = session?.user?.id;

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      setDays(trainedDays(await fetchSessionDays(uid)));
    } catch (e) {
      console.warn(e);
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const count = countTrainedInMonth(days, mes);
  const canGoNext = !isCurrentMonth(mes, today);

  return (
    <Screen>
      <Section title={t('calendario.titulo')}>
        <Card>
          <View style={styles.header}>
            <IconNav
              icon="chevron-left"
              label={t('calendario.mesAnterior')}
              onPress={() => setMes((prev) => shiftMonth(prev, -1))}
            />
            <ThemedText type="subtitle">{monthTitle(locale, mes.month, mes.year)}</ThemedText>
            <IconNav
              icon="chevron-right"
              label={t('calendario.mesSiguiente')}
              disabled={!canGoNext}
              onPress={() => {
                if (canGoNext) setMes((prev) => shiftMonth(prev, 1));
              }}
            />
          </View>

          <MonthCalendar
            month={mes.month}
            year={mes.year}
            trainedDays={days}
            today={today}
            selectedDay={selected}
            onSelectDay={setSelected}
            weekdayLabels={calendar(locale).weekdaysShort}
            formatDayLabel={(iso) => formatLongDate(iso, locale)}
          />

          <View style={[styles.legend, { borderTopColor: theme.border }]}>
            <Legend color={theme.accent} label={t('calendario.diaEntrenado')} />
            <Legend color={theme.border} label={t('calendario.diaSinEntrenar')} />
          </View>
        </Card>
      </Section>

      <Card tone="brand">
        <ThemedText type="smallBold">
          {count === 0
            ? t('calendario.sinEntrenos')
            : t('calendario.resumen', {
                count,
                veces: count === 1 ? t('calendario.resumenVez') : t('calendario.resumenVeces'),
              })}
        </ThemedText>

        {selected ? (
          <ThemedText type="small" themeColor="textSecondary">
            {formatLongDate(selected, locale)} ·{' '}
            {days.has(selected) ? t('calendario.diaEntrenado') : t('calendario.diaSinEntrenar')}
          </ThemedText>
        ) : null}
      </Card>
    </Screen>
  );
}

function IconNav({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: 'chevron-left' | 'chevron-right';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={[
        styles.nav,
        { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
        disabled && styles.navDisabled,
      ]}>
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={disabled ? theme.textMuted : theme.primaryBright}
      />
    </Pressable>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: { opacity: 0.5 },
  legend: {
    flexDirection: 'row',
    gap: Spacing.four,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});