import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, ButtonRow } from '@/components/ui/button';
import { Card, Row, StatCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty';
import { HeroHeader } from '@/components/ui/hero';
import { Screen, Section } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { useWorkout } from '@/context/workout';
import {
  fetchActiveRoutineForClient,
  fetchRandomPhrase,
  fetchRandomTip,
  fetchSchedule,
  fetchSessions,
  insertSession,
  type RoutineFull,
} from '@/lib/db';
import {
  formatDurationMs,
  formatMinutes,
  regionLabel,
  weekdayLabel,
  weekdayOf,
} from '@/lib/format';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatWeekdayLongDate, t } from '@/i18n';
import { useI18n } from '@/context/i18n';
import type { MotivationalPhrase, NutritionTip, RoutineSchedule, WorkoutSession } from '@/types';

function isSameDay(iso: string, date: Date): boolean {
  return new Date(iso).toDateString() === date.toDateString();
}

/**
 * Inicio.
 *
 * Esta pantalla es la que fija el criterio de color de la app y no usa ningún
 * valor suelto: todo sale de los tokens de `src/constants/theme.ts`.
 *
 * - `primary` (un solo azul) = identidad y acción principal: el hero, el botón
 *   de empezar, "Ver mi rutina", el badge del día y los chips de ícono.
 * - `accent` (un solo verde) = progreso y estado positivo: sesión en curso,
 *   "¡Listo!", el tip de alimentación y el ícono de la cita. Es el único verde
 *   de la pantalla; no se usa para decorar.
 * - Neutros = todo lo demás: tarjetas (`surface`), el contenido dentro de ellas
 *   (`surfaceElevated`) y el texto (`textPrimary` / `textSecondary`).
 *
 * Los tres indicadores de "Tu progreso" comparten el mismo tratamiento a
 * propósito: miden lo mismo, así que pintar uno de verde sería una jerarquía
 * inventada.
 */
export default function ClientHomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, profile } = useSession();
  const workout = useWorkout();
  const { locale } = useI18n();

  const [routine, setRoutine] = useState<RoutineFull | null>(null);
  const [schedule, setSchedule] = useState<RoutineSchedule[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [phrase, setPhrase] = useState<MotivationalPhrase | null>(null);
  const [tip, setTip] = useState<NutritionTip | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(0);

  const uid = session?.user?.id;

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const [r, s, sess, ph, t] = await Promise.all([
        fetchActiveRoutineForClient(uid),
        fetchSchedule(uid),
        fetchSessions(uid),
        fetchRandomPhrase(),
        fetchRandomTip(),
      ]);
      setRoutine(r);
      setSchedule(s);
      setSessions(sess);
      setNow(Date.now());
      if (ph) setPhrase(ph);
      if (t) setTip(t);
    } catch (e) {
      console.warn('Error cargando home', e);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const todayWeekday = weekdayOf(new Date());
  const scheduledToday = schedule.find((s) => s.weekday === todayWeekday);
  const todayBlock = routine?.routine_blocks.find((b) => b.id === scheduledToday?.block_id) ?? null;
  const completedToday = sessions.some((s) => isSameDay(s.completed_on, new Date(now)));

  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0);
  const weekSessions = sessions.filter((s) => {
    const diff = now - new Date(s.completed_on).getTime();
    return diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  async function markComplete() {
    if (!uid || !routine || !todayBlock || completedToday) return;
    setSaving(true);
    try {
      await insertSession({
        client_id: uid,
        block_id: todayBlock.id,
        routine_id: routine.id,
        weekday: todayWeekday,
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleFinishTimer() {
    await workout.finish();
    await load();
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={theme.primary} style={styles.loader} />
      </Screen>
    );
  }

  const firstName = profile?.name?.split(' ')[0] ?? '';

  return (
    <Screen padded={false} contentStyle={styles.screenContent}>
      <HeroHeader
        eyebrow={formatWeekdayLongDate(new Date(), locale)}
        title={firstName ? t('inicio.holaNombre', { nombre: firstName }) : t('inicio.hola')}
        subtitle={routine?.title ?? t('inicio.subtitulo')}
      />

      <View style={styles.body}>
        {phrase ? (
          <Card tone="brand" style={styles.quoteCard}>
            <MaterialCommunityIcons name="format-quote-open" size={22} color={theme.accent} />
            <ThemedText type="quote" style={styles.quote}>
              {phrase.text}
            </ThemedText>
            {phrase.author ? (
              <ThemedText type="smallBold" themeColor="textSecondary">
                {phrase.author}
              </ThemedText>
            ) : null}
          </Card>
        ) : null}

        <Section title={t('inicio.entrenamientoHoy')}>
          {workout.status === 'running' || workout.status === 'paused' ? (
            <Card>
              <View style={styles.timerHeader}>
                <ThemedText type="eyebrow" themeColor="accent">
                  {t('inicio.enCurso')}
                </ThemedText>
                <View style={[styles.liveDot, { backgroundColor: theme.accent }]} />
              </View>
              <ThemedText type="display" style={styles.timer}>
                {formatDurationMs(workout.elapsedMs)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {workout.label ?? t('inicio.entrenamiento')}
              </ThemedText>
              <ButtonRow>
                {workout.status === 'running' ? (
                  <Button
                    variant="secondary"
                    label={t('inicio.pausar')}
                    icon="pause"
                    onPress={workout.pause}
                    style={styles.flex}
                  />
                ) : (
                  <Button
                    variant="secondary"
                    label={t('inicio.reanudar')}
                    icon="play"
                    onPress={workout.resume}
                    style={styles.flex}
                  />
                )}
                <Button
                  label={t('common.finalizar')}
                  icon="stop"
                  onPress={handleFinishTimer}
                  style={styles.flex}
                />
              </ButtonRow>
            </Card>
          ) : !routine ? (
            <EmptyState
              icon="clipboard-text-outline"
              title={t('inicio.sinRutina')}
              subtitle={t('inicio.sinRutinaSubtitulo')}
            />
          ) : todayBlock && scheduledToday ? (
            <Card>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: theme.surfaceBrand, borderColor: theme.primaryBorder }]}>
                  <ThemedText type="smallBold" themeColor="primaryBright">
                    {weekdayLabel(locale, todayWeekday)}
                  </ThemedText>
                </View>
                <View style={[styles.badge, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={14}
                    color={theme.textSecondary}
                  />
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {regionLabel(locale, todayBlock.region)}
                  </ThemedText>
                </View>
              </View>

              <ThemedText type="subtitle">{todayBlock.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('format.ejerciciosSeries', {
                  ejercicios: todayBlock.routine_block_exercises.length,
                  series: todayBlock.routine_block_exercises.reduce((acc, e) => acc + (e.sets ?? 0), 0),
                })}
              </ThemedText>

              {completedToday ? (
                <View style={[styles.done, { backgroundColor: theme.accentSubtle, borderColor: theme.accentBorder }]}>
                  <MaterialCommunityIcons name="check-circle" size={20} color={theme.accent} />
                  <ThemedText type="smallBold" themeColor="accent" style={styles.flex}>
                    {t('inicio.listo')}
                  </ThemedText>
                </View>
              ) : (
                <ButtonRow>
                  <Button
                    variant="secondary"
                    label={t('inicio.completado')}
                    icon="check"
                    onPress={markComplete}
                    loading={saving}
                    style={styles.flex}
                  />
                  <Button
                    label={t('inicio.empezar')}
                    icon="play"
                    onPress={() =>
                      workout.start({ blockId: todayBlock.id, routineId: routine.id, label: todayBlock.name })
                    }
                    style={styles.flex}
                  />
                </ButtonRow>
              )}
            </Card>
          ) : (
            <EmptyState
              icon="weather-night"
              title={t('inicio.descanso')}
              subtitle={t('inicio.descansoSubtitulo')}
            />
          )}
        </Section>

        <Section title={t('inicio.tuProgreso')}>
          <View style={styles.row}>
            <StatCard icon="dumbbell" value={String(totalSessions)} label={t('inicio.entrenamientos')} />
            <StatCard icon="timer-outline" value={formatMinutes(locale, totalMinutes)} label={t('inicio.tiempoTotal')} />
            <StatCard icon="fire" value={String(weekSessions)} label={t('inicio.estaSemana')} />
          </View>
        </Section>

        {/* Solo aparece cuando no hay nada que entrenar, así que es la acción
            principal de la pantalla en ese estado: lleva el azul `primary`. */}
        {!routine || !routine.routine_blocks.length ? (
          <Button
            label={t('inicio.verMiRutina')}
            icon="arrow-right"
            onPress={() => router.push('/rutina')}
          />
        ) : null}

        {tip ? (
          <Section title={t('inicio.tipAlimentacion')}>
            <Card>
              <View style={styles.tipHeader}>
                <View style={[styles.tipIcon, { backgroundColor: theme.accentSubtle, borderColor: theme.accentBorder }]}>
                  <MaterialCommunityIcons name="food-apple-outline" size={20} color={theme.accent} />
                </View>
                <ThemedText type="default" style={styles.flex}>
                  {tip.title}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {tip.body}
              </ThemedText>
            </Card>
          </Section>
        ) : null}

        <Row>
          <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
            {t('inicio.queresVerProgreso')}
          </ThemedText>
          <ThemedText type="linkPrimary" onPress={() => router.push('/historial')}>
            {t('inicio.verHistorial')}
          </ThemedText>
        </Row>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.five },
  screenContent: { paddingTop: 0 },
  body: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four, gap: Spacing.four },
  quoteCard: { gap: Spacing.two, borderRadius: Radius.lg },
  quote: { letterSpacing: -0.2 },
  timerHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  timer: { fontVariant: ['tabular-nums'] },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'stretch' },
  flex: { flex: 1, minWidth: 0 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
