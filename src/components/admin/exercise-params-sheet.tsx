import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, ButtonRow } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { WheelPicker, type WheelOption } from '@/components/ui/wheel-picker';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useI18n } from '@/context/i18n';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import {
  EMPTY_REPS,
  REPS_MAX,
  REPS_MIN,
  WEIGHT_STEP_DEFAULT,
  WEIGHT_STEPS,
  formatNumber,
  formatRest,
  parseReps,
  repsAreValid,
  restOptions,
  seriesOptions,
  serializeReps,
  weightOptions,
  type RepsDraft,
  type RepsMode,
} from '@/lib/routine-params';

/**
 * Valor de los cuatro parámetros de un ejercicio.
 *
 * `null` = sin definir. La UI lo muestra como "—" y nunca lo inventa.
 * `pesoKg = 0` significa "peso corporal / sin peso".
 */
export type ExerciseParamsValue = {
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  pesoKg: number | null;
};

type Props = {
  title: string;
  /** Parámetros actuales, preseleccionados al editar. Vacío = todo sin definir. */
  initial?: ExerciseParamsValue | null;
  saving?: boolean;
  onCancel: () => void;
  onSave: (value: ExerciseParamsValue) => void;
};

/**
 * Panel modal para elegir series, repeticiones, descanso y peso con selectores
 * deslizables. Se monta solo mientras está abierto, así que el estado arranca
 * siempre desde `initial`.
 *
 * Series y repeticiones son obligatorias; descanso y peso quedan opcionales.
 * El valor "sin definir" es una opción más del wheel (arriba de todo, "—").
 */
export function ExerciseParamsSheet({ title, initial, saving, onCancel, onSave }: Props) {
  const theme = useTheme();
  // Los rótulos de los selectores cambian con el idioma.
  const { locale } = useI18n();

  const [sets, setSets] = useState<number | null>(initial?.sets ?? null);
  const [reps, setReps] = useState<RepsDraft>(() =>
    initial?.reps != null && initial.reps !== '' ? parseReps(initial.reps) : EMPTY_REPS
  );
  const [rest, setRest] = useState<number | null>(initial?.restSeconds ?? null);
  const [peso, setPeso] = useState<number | null>(initial?.pesoKg ?? null);
  const [pesoStep, setPesoStep] = useState<number>(WEIGHT_STEP_DEFAULT);
  const [error, setError] = useState<string | null>(null);

  const undefinedOption: WheelOption = { value: null, label: '—' };

  const seriesWheel: WheelOption[] = [
    undefinedOption,
    ...seriesOptions().map((value) => ({ value, label: String(value) })),
  ];

  const repsNumbers = Array.from(
    { length: REPS_MAX - REPS_MIN + 1 },
    (_, i) => REPS_MIN + i
  );
  const repsWheel: WheelOption[] = [
    { value: null, label: '—' },
    ...repsNumbers.map((value) => ({ value, label: String(value) })),
  ];

  const restWheel: WheelOption[] = [
    { value: null, label: '—' },
    ...restOptions().map((value) => ({ value, label: formatRest(locale, value) ?? '' })),
  ];

  const pesoWheel: WheelOption[] = [
    { value: null, label: '—' },
    { value: 0, label: t('common.pesoCorporal') },
    ...weightOptions(pesoStep)
      .filter((value) => value > 0)
      .map((value) => ({
        value,
        label: `${formatNumber(locale, value)} ${t('admin.kilos')}`,
      })),
  ];

  function changeMode(mode: RepsMode) {
    setError(null);
    setReps((current) => {
      if (mode === 'fallo') return { mode, fijo: null, min: null, max: null };
      if (mode === 'fijo') {
        const fijo = current.fijo ?? current.min ?? null;
        return { mode, fijo, min: null, max: null };
      }
      const fijo = current.fijo ?? null;
      const min = current.min ?? fijo ?? null;
      const max = current.max ?? fijo ?? null;
      return { mode, fijo: null, min, max };
    });
  }

  function handleSave() {
    setError(null);
    if (sets == null) {
      setError(t('admin.faltanSeriesReps'));
      return;
    }
    if (!repsAreValid(reps)) {
      setError(reps.mode === 'rango' ? t('admin.rangoInvalido') : t('admin.faltanSeriesReps'));
      return;
    }
    onSave({
      sets,
      reps: serializeReps(reps),
      restSeconds: rest,
      pesoKg: peso,
    });
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel={t('common.cerrar')}>
        <Pressable style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => {}}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.flex} numberOfLines={1}>
              {title}
            </ThemedText>
            <Pressable
              onPress={onCancel}
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
            <ThemedText type="small" themeColor="textSecondary">
              {t('admin.parametrosObligatorios')}
            </ThemedText>

            <ParamField label={t('common.series')}>
              <WheelPicker
                label={t('common.series')}
                options={seriesWheel}
                value={sets}
                onChange={setSets}
              />
            </ParamField>

            <ParamField label={t('common.repeticiones')}>
              <View style={styles.chipsRow}>
                <Chip
                  label={t('admin.repsFijo')}
                  selected={reps.mode === 'fijo'}
                  onPress={() => changeMode('fijo')}
                />
                <Chip
                  label={t('admin.repsRango')}
                  selected={reps.mode === 'rango'}
                  onPress={() => changeMode('rango')}
                />
                <Chip
                  label={t('admin.repsAlFallo')}
                  selected={reps.mode === 'fallo'}
                  onPress={() => changeMode('fallo')}
                />
              </View>

              {reps.mode === 'fijo' ? (
                <WheelPicker
                  label={t('common.repeticiones')}
                  options={repsWheel}
                  value={reps.fijo}
                  onChange={(value) => setReps((current) => ({ ...current, fijo: value }))}
                />
              ) : null}

              {reps.mode === 'rango' ? (
                <View style={styles.range}>
                  <View style={styles.flex}>
                    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.subLabel}>
                      {t('admin.minimo')}
                    </ThemedText>
                    <WheelPicker
                      label={t('admin.minimo')}
                      options={repsWheel}
                      value={reps.min}
                      onChange={(value) =>
                        setReps((current) => ({
                          ...current,
                          min: value,
                          max: value != null && current.max != null && current.max < value ? value : current.max,
                        }))
                      }
                    />
                  </View>
                  <View style={styles.flex}>
                    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.subLabel}>
                      {t('admin.maximo')}
                    </ThemedText>
                    <WheelPicker
                      label={t('admin.maximo')}
                      options={repsWheel}
                      value={reps.max}
                      onChange={(value) =>
                        setReps((current) => ({
                          ...current,
                          max: value,
                          min: value != null && current.min != null && current.min > value ? value : current.min,
                        }))
                      }
                    />
                  </View>
                </View>
              ) : null}

              {reps.mode === 'fallo' ? (
                <ThemedText type="small" themeColor="accent">
                  {t('common.alFallo')}
                </ThemedText>
              ) : null}
            </ParamField>

            <ParamField label={`${t('common.descanso')} · ${t('common.opcional')}`}>
              <WheelPicker
                label={t('common.descanso')}
                options={restWheel}
                value={rest}
                onChange={setRest}
              />
            </ParamField>

            <ParamField label={`${t('common.peso')} · ${t('common.opcional')}`}>
              <View style={styles.chipsRow}>
                {WEIGHT_STEPS.map((step) => (
                  <Chip
                    key={step}
                    label={`${formatNumber(locale, step)} ${t('admin.kilos')}`}
                    selected={pesoStep === step}
                    onPress={() => setPesoStep(step)}
                  />
                ))}
              </View>
              <WheelPicker
                label={t('common.peso')}
                options={pesoWheel}
                value={peso}
                onChange={setPeso}
              />
            </ParamField>

            {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
          </ScrollView>

          <ButtonRow>
            <Button
              variant="secondary"
              label={t('common.cancelar')}
              onPress={onCancel}
              style={styles.flex}
            />
            <Button
              label={t('common.agregar')}
              icon="check"
              onPress={handleSave}
              loading={saving}
              style={styles.flex}
            />
          </ButtonRow>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ParamField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '92%',
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three,
    ...Shadows.raised,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  close: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: Spacing.three, paddingBottom: Spacing.two },
  field: { gap: Spacing.two },
  subLabel: { marginBottom: Spacing.one },
  range: { flexDirection: 'row', gap: Spacing.two },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  flex: { flex: 1 },
});
