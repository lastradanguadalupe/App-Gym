import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, ButtonRow } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { useWorkout } from '@/context/workout';
import {
  clearBlockDay,
  fetchActiveRoutineForClient,
  fetchSchedule,
  fetchSessions,
  insertSession,
  setBlockDay,
  type RoutineFull,
} from '@/lib/db';
import {
  formatDurationMs,
  regionLabel,
  weekdayLabel,
  weekdayLabelsShort,
  weekdayOf,
} from '@/lib/format';
import { compactSummary } from '@/lib/routine-params';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/context/i18n';
import { t } from '@/i18n';
import type { RoutineBlock, RoutineSchedule, WorkoutSession } from '@/types';

function isSameDay(iso: string, date: Date): boolean {
  return new Date(iso).toDateString() === date.toDateString();
}

export default function RutinaScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session } = useSession();
  const workout = useWorkout();
  const { locale } = useI18n();

  const [routine, setRoutine] = useState<RoutineFull | null>(null);
  const [schedule, setSchedule] = useState<RoutineSchedule[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const uid = session?.user?.id;
  const todayWeekday = weekdayOf(new Date());

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const [r, s, sess] = await Promise.all([
        fetchActiveRoutineForClient(uid),
        fetchSchedule(uid),
        fetchSessions(uid),
      ]);
      setRoutine(r);
      setSchedule(s);
      setSessions(sess);
    } catch (e) {
      console.warn('Error cargando rutina', e);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function scheduledWeekdayOf(blockId: number): number | null {
    return schedule.find((s) => s.block_id === blockId)?.weekday ?? null;
  }

  function blockOfWeekday(weekday: number): RoutineBlock | null {
    const s = schedule.find((x) => x.weekday === weekday);
    if (!s) return null;
    return routine?.routine_blocks.find((b) => b.id === s.block_id) ?? null;
  }

  async function handleSetDay(block: RoutineBlock, weekday: number) {
    if (!uid) return;
    const currently = scheduledWeekdayOf(block.id);
    try {
      if (currently === weekday) {
        await clearBlockDay(uid, block.id);
      } else {
        await setBlockDay(uid, block.id, weekday);
      }
      await load();
    } catch (e) {
      console.warn('Error actualizando semana', e);
    }
  }

  async function handleFinishTimer() {
    const id = await workout.finish();
    if (id == null) console.warn('La sesión no se guardó');
    await load();
  }

  async function markComplete(block: RoutineBlock) {
    if (!uid || !routine || savingId != null) return;
    setSavingId(block.id);
    try {
      await insertSession({
        client_id: uid,
        block_id: block.id,
        routine_id: routine.id,
        weekday: todayWeekday,
      });
      await load();
    } finally {
      setSavingId(null);
    }
  }

  function isCompletedToday(blockId: number): boolean {
    return sessions.some((s) => s.block_id === blockId && isSameDay(s.completed_on, new Date()));
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={theme.brandBright} style={styles.loader} />
      </Screen>
    );
  }

  if (!routine || !routine.routine_blocks.length) {
    return (
      <Screen>
        <ThemedText type="display">{t('nav.rutina')}</ThemedText>
        <EmptyState
          icon="clipboard-text-outline"
          title={t('rutina.sinRutina')}
          subtitle={t('rutina.sinRutinaSubtitulo')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {workout.status === 'running' || workout.status === 'paused' ? (
        <Card>
          <View style={styles.timerHeader}>
            <ThemedText type="eyebrow" themeColor="teal">
              {t('inicio.enCurso')}
            </ThemedText>
            <View style={[styles.liveDot, { backgroundColor: theme.teal }]} />
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
      ) : null}

      <View style={styles.titleBlock}>
        <ThemedText type="display">{routine.title}</ThemedText>
        {routine.description ? (
          <ThemedText type="small" themeColor="textSecondary">
            {routine.description}
          </ThemedText>
        ) : null}
      </View>

      {/* Resumen de la semana */}
      <Card>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          {t('rutina.tuSemana')}
        </ThemedText>
        {Array.from({ length: 7 }, (_, weekday) => {
          const block = blockOfWeekday(weekday);
          return (
            <View key={weekday} style={styles.weekRow}>
              <ThemedText type="small" themeColor={block ? 'text' : 'textSecondary'} style={styles.weekDay}>
                {weekdayLabel(locale, weekday)}
              </ThemedText>
              <ThemedText type="small" themeColor={block ? 'brandBright' : 'textSecondary'}>
                {block ? block.name : t('common.libreDescanso')}
              </ThemedText>
            </View>
          );
        })}
      </Card>

      <ThemedText type="small" themeColor="textSecondary" style={styles.helper}>
        {t('rutina.helperSemana')}
      </ThemedText>

      {routine.routine_blocks.map((block, index) => {
        const completed = isCompletedToday(block.id);
        return (
          <Card key={block.id} style={styles.blockCard}>
            <View>
              <ThemedText type="smallBold" themeColor="brandBright">
                {t('common.bloqueRegion', { num: index + 1, region: regionLabel(locale, block.region) })}
              </ThemedText>
              <ThemedText type="subtitle">{block.name}</ThemedText>
            </View>

            <View style={styles.group}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('common.diaSemana')}
              </ThemedText>
              <View style={styles.chipsRow}>
                {weekdayLabelsShort(locale).map((label, weekday) => (
                  <Chip
                    key={weekday}
                    label={label}
                    selected={scheduledWeekdayOf(block.id) === weekday}
                    onPress={() => handleSetDay(block, weekday)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.exerciseList}>
              {block.routine_block_exercises.map((rbe) => (
                <Pressable
                  key={rbe.id}
                  onPress={() =>
                    router.push({ pathname: '/rutina/[id]', params: { id: rbe.exercise_id, blockId: rbe.block_id } })
                  }
                  style={({ pressed }) => pressed && styles.pressed}>
                  <Card padded={false} style={styles.exerciseRow}>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold">{rbe.exercises?.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {compactSummary(locale, rbe)}
                      </ThemedText>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.brandBright} />
                  </Card>
                </Pressable>
              ))}
            </View>

            {completed ? (
              <View style={[styles.done, { backgroundColor: `${theme.teal}1A`, borderColor: `${theme.teal}40` }]}>
                <MaterialCommunityIcons name="check-circle" size={20} color={theme.teal} />
                <ThemedText type="smallBold" themeColor="teal">
                  {t('rutina.completadoHoy')}
                </ThemedText>
              </View>
            ) : (
              <ButtonRow>
                <Button
                  variant="secondary"
                  label={t('rutina.marcarCompleto')}
                  icon="check"
                  onPress={() => markComplete(block)}
                  loading={savingId === block.id}
                  style={styles.flex}
                />
                <Button
                  label={t('inicio.empezar')}
                  icon="play"
                  onPress={() =>
                    workout.start({ blockId: block.id, routineId: routine.id, label: block.name })
                  }
                  style={styles.flex}
                />
              </ButtonRow>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.five },
  titleBlock: { gap: Spacing.one },
  group: { gap: Spacing.md },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  weekDay: { fontWeight: '700' },
  helper: { textAlign: 'center' },
  blockCard: { gap: Spacing.three },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  exerciseList: { gap: Spacing.two },
  exerciseRow: {
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
  },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  timerHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  timer: { fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.7 },
  flex: { flex: 1, minWidth: 0 },
});