import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { WheelField } from '@/components/ui/body-fields';
import { Button } from '@/components/ui/button';
import { MonthCalendar } from '@/components/ui/month-calendar';
import { WheelPicker } from '@/components/ui/wheel-picker';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { calendar, formatLongDate, monthTitle, t } from '@/i18n';
import {
  birthDateBounds,
  clampMonth,
  earlierThanMonth,
  monthOfIso,
  suggestedBirthMonth,
} from '@/lib/body-profile';
import { shiftMonth, type Mes } from '@/lib/calendar';
import { computeEdad } from '@/lib/format';
import type { WheelOption } from '@/lib/wheel';
import type { Idioma } from '@/types';

const NO_DAYS: ReadonlySet<string> = new Set();

type Props = {
  label: string;
  /** Fecha `YYYY-MM-DD` en hora local, o `null`. */
  value: string | null;
  onChange: (iso: string) => void;
  placeholder: string;
  locale: Idioma;
  /** Hoy (inyectable para tests). Por defecto, la fecha del sistema. */
  today?: Date;
};

/**
 * Campo de fecha de nacimiento.
 *
 * Reemplaza al TextInput: abre una grilla mensual (el mismo `MonthCalendar` de
 * la pantalla de asistencia) con límites de 100 años atrás y sin futuro. Para no
 * navegar mes por mes durante años, al tocar el título se abre un selector
 * rápido de mes y año con las ruedas. Es todo `View`/`Pressable` propio: no hay
 * ninguna librería nativa de date picker, así que funciona igual en celular y en
 * web. La fecha se guarda como `YYYY-MM-DD` en hora local, nunca vía `toISOString`.
 */
export function DateField({ label, value, onChange, placeholder, locale, today = new Date() }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [quick, setQuick] = useState(false);
  const [view, setView] = useState<Mes>(() => suggestedBirthMonth(today));

  const { minIso, maxIso } = birthDateBounds(today);
  const minMes = monthOfIso(minIso);
  const maxMes = monthOfIso(maxIso);

  const edad = value ? computeEdad(value) : null;
  const canGoPrev = earlierThanMonth(minMes, view);
  const canGoNext = earlierThanMonth(view, maxMes);

  const monthOptions: WheelOption<number>[] = calendar(locale).months.map((name, index) => ({
    value: index,
    label: `${name.charAt(0).toUpperCase()}${name.slice(1)}`,
  }));
  const yearOptions: WheelOption<number>[] = [];
  for (let year = minMes.year; year <= maxMes.year; year += 1) {
    yearOptions.push({ value: year, label: String(year) });
  }

  function openPicker() {
    setView(value ? monthOfIso(value) : suggestedBirthMonth(today));
    setQuick(false);
    setOpen(true);
  }

  function changeMonth(delta: number) {
    setView((prev) => shiftMonth(prev, delta));
  }

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>

      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ? formatLongDate(value, locale) : placeholder }}
        style={[styles.box, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText
          style={{ color: value ? theme.text : theme.muted, flexShrink: 1 }}
          numberOfLines={1}>
          {value ? formatLongDate(value, locale) : placeholder}
        </ThemedText>
        {edad != null ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('onboarding.edad', { edad })}
          </ThemedText>
        ) : null}
        <MaterialCommunityIcons
          name="calendar-month-outline"
          size={20}
          color={theme.textSecondary}
        />
      </Pressable>

      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityLabel={t('common.cerrar')}>
          <Pressable
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => {}}>
            <View style={styles.header}>
              {quick ? (
                <ThemedText type="subtitle" style={styles.flex} numberOfLines={1}>
                  {t('onboarding.anio')} · {t('onboarding.mes')}
                </ThemedText>
              ) : (
                <>
                  <NavButton
                    icon="chevron-left"
                    label={t('calendario.mesAnterior')}
                    disabled={!canGoPrev}
                    onPress={() => changeMonth(-1)}
                  />
                  <Pressable
                    onPress={() => setQuick(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('onboarding.elegirMesAnio')}
                    style={styles.title}>
                    <ThemedText type="subtitle" numberOfLines={1}>
                      {monthTitle(locale, view.month, view.year)}
                    </ThemedText>
                  </Pressable>
                  <NavButton
                    icon="chevron-right"
                    label={t('calendario.mesSiguiente')}
                    disabled={!canGoNext}
                    onPress={() => changeMonth(1)}
                  />
                </>
              )}
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('common.cerrar')}
                style={styles.close}>
                <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              {quick ? (
                <View style={styles.quick}>
                  <WheelField label={t('onboarding.mes')}>
                    <WheelPicker
                      label={t('onboarding.mes')}
                      options={monthOptions}
                      value={view.month}
                      onChange={(month) =>
                        month != null &&
                        setView((prev) => clampMonth({ year: prev.year, month }, minMes, maxMes))
                      }
                    />
                  </WheelField>
                  <WheelField label={t('onboarding.anio')}>
                    <WheelPicker
                      label={t('onboarding.anio')}
                      options={yearOptions}
                      value={view.year}
                      onChange={(year) =>
                        year != null &&
                        setView((prev) => clampMonth({ year, month: prev.month }, minMes, maxMes))
                      }
                    />
                  </WheelField>
                  <Button
                    variant="secondary"
                    label={t('common.listo')}
                    onPress={() => setQuick(false)}
                  />
                </View>
              ) : (
                <MonthCalendar
                  month={view.month}
                  year={view.year}
                  trainedDays={NO_DAYS}
                  today={today}
                  selectedDay={value}
                  minIso={minIso}
                  maxIso={maxIso}
                  onSelectDay={(iso) => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  weekdayLabels={calendar(locale).weekdaysShort}
                  formatDayLabel={(iso) => formatLongDate(iso, locale)}
                />
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function NavButton({
  icon,
  label,
  onPress,
  disabled,
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
      accessibilityState={{ disabled: Boolean(disabled) }}
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

const styles = StyleSheet.create({
  field: { gap: Spacing.two },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    minHeight: 52,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '92%',
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three,
    ...Shadows.raised,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { flex: 1, alignItems: 'center' },
  nav: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: { opacity: 0.5 },
  close: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: Spacing.two },
  quick: { gap: Spacing.three },
  flex: { flex: 1 },
});
