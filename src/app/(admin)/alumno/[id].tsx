import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { ExerciseParamsSheet, type ExerciseParamsValue } from '@/components/admin/exercise-params-sheet';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card, StatCard } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty';
import { Field } from '@/components/ui/field';
import { IconAction } from '@/components/ui/icon-action';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import {
  addBlockExercise,
  clearBlockDay,
  createBlock,
  createRoutineFull,
  deleteBlock,
  deleteBlockExercise,
  deleteRoutine,
  fetchActiveRoutineForClient,
  fetchClientDetails,
  fetchExercises,
  fetchMuscleGroups,
  fetchProfile,
  fetchSchedule,
  fetchSessions,
  setBlockDay,
  updateBlockExercise,
  type RoutineFull,
} from '@/lib/db';
import {
  computeEdad,
  experienciaLabel,
  formatDateTime,
  formatMinutes,
  regionLabel,
  weekdayLabel,
  weekdayLabelsShort,
} from '@/lib/format';
import { friendlyError } from '@/lib/errors';
import { paramSegments } from '@/lib/routine-params';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/context/i18n';
import { t } from '@/i18n';
import type { Idioma } from '@/types';
import type {
  ClientDetails,
  Exercise,
  MuscleGroup,
  Profile,
  Region,
  RoutineBlock,
  RoutineBlockExercise,
  RoutineSchedule,
  WorkoutSession,
} from '@/types';

/** Las etiquetas se resuelven por idioma, no como constante de módulo. */
const REGION_VALUES: Region[] = ['superior', 'inferior', 'core', 'full'];
function regions(locale: Idioma): { value: Region; label: string }[] {
  return REGION_VALUES.map((value) => ({ value, label: regionLabel(locale, value) }));
}

/** Un ejercicio ya elegido para una rutina nueva, con sus parámetros. */
type DraftExercise = ExerciseParamsValue & { exerciseId: number };

type DraftBlock = {
  key: number;
  name: string;
  region: Region;
  exercises: DraftExercise[];
};

/**
 * A qué apunta el panel de parámetros.
 *
 *  - `draft`: ejercicio de una rutina aún sin guardar.
 *  - `block`: ejercicio nuevo que se agrega a un bloque ya existente.
 *  - `rbe`:   ejercicio ya guardado que se está editando.
 */
type ParamTarget =
  | { kind: 'draft'; blockKey: number; exerciseId: number; name: string }
  | { kind: 'block'; blockId: number; exerciseId: number; name: string }
  | { kind: 'rbe'; rbe: RoutineBlockExercise; name: string };

/** Los cuatro parámetros con rótulo, en una línea. "—" cuando no está definido. */
function ParamLine({
  rbe,
}: {
  rbe: Pick<RoutineBlockExercise, 'sets' | 'reps' | 'rest_seconds' | 'peso_kg'>;
}) {
  const { locale } = useI18n();
  const segments = paramSegments(locale, rbe);
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {segments.map((segment, index) => (
        <ThemedText
          key={segment.label}
          type="small"
          themeColor={segment.defined ? 'textSecondary' : 'textMuted'}>
          {`${index ? ' · ' : ''}${segment.label}: ${segment.value}`}
        </ThemedText>
      ))}
    </ThemedText>
  );
}

function Meta({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={wide ? styles.metaWide : styles.meta}>
      <ThemedText type="eyebrow" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small">{value}</ThemedText>
    </View>
  );
}

function toParamsValue(rbe: RoutineBlockExercise): ExerciseParamsValue {
  return {
    sets: rbe.sets,
    reps: rbe.reps,
    restSeconds: rbe.rest_seconds,
    pesoKg: rbe.peso_kg,
  };
}

export default function AdminAlumnoScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { profile: me } = useSession();
  const { locale } = useI18n();
  const userId = params.id ?? '';

  const [client, setClient] = useState<Profile | null>(null);
  const [details, setDetails] = useState<ClientDetails | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [routine, setRoutine] = useState<RoutineFull | null>(null);
  const [schedule, setSchedule] = useState<RoutineSchedule[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [exercises, setExercises] = useState<(Exercise & { muscle_groups: MuscleGroup })[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Forms
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newBlockName, setNewBlockName] = useState('');
  const [newBlockRegion, setNewBlockRegion] = useState<Region>('superior');
  const [draftBlocks, setDraftBlocks] = useState<DraftBlock[]>([]);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftOk, setDraftOk] = useState<string | null>(null);
  const [pickerBlock, setPickerBlock] = useState<number | null>(null);
  const [pickerMuscle, setPickerMuscle] = useState<number | null>(null);

  // Panel de parámetros (series / reps / descanso / peso)
  const [paramTarget, setParamTarget] = useState<ParamTarget | null>(null);
  const [paramInitial, setParamInitial] = useState<ExerciseParamsValue | null>(null);
  const [paramSaving, setParamSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [p, d, s, r, mg, ex, sch] = await Promise.all([
        fetchProfile(userId),
        fetchClientDetails(userId),
        fetchSessions(userId),
        fetchActiveRoutineForClient(userId),
        fetchMuscleGroups(),
        fetchExercises(),
        fetchSchedule(userId),
      ]);
      setClient(p);
      setDetails(d);
      setSessions(s);
      setRoutine(r);
      setMuscleGroups(mg);
      setExercises(ex as (Exercise & { muscle_groups: MuscleGroup })[]);
      setSchedule(sch);
    } catch (e) {
      console.warn('Error cargando alumno', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------- Panel de parámetros ----------

  function openDraftExercise(
    blockKey: number,
    exerciseId: number,
    name: string,
    added: DraftExercise | undefined
  ) {
    setParamInitial(added ? { ...added } : null);
    setParamTarget({ kind: 'draft', blockKey, exerciseId, name });
  }

  function openAddToBlock(blockId: number, ex: Exercise) {
    setParamInitial(null);
    setParamTarget({ kind: 'block', blockId, exerciseId: ex.id, name: ex.name });
  }

  function openEditRbe(rbe: RoutineBlockExercise) {
    setParamInitial(toParamsValue(rbe));
    setParamTarget({ kind: 'rbe', rbe, name: rbe.exercises?.name ?? t('admin.ejercicio') });
  }

  async function handleSaveParams(value: ExerciseParamsValue) {
    if (!paramTarget) return;

    if (paramTarget.kind === 'draft') {
      const target = paramTarget;
      setDraftBlocks((blocks) =>
        blocks.map((b) => {
          if (b.key !== target.blockKey) return b;
          const next = b.exercises.filter((e) => e.exerciseId !== target.exerciseId);
          next.push({ exerciseId: target.exerciseId, ...value });
          return { ...b, exercises: next };
        })
      );
      setParamTarget(null);
      return;
    }

    setParamSaving(true);
    try {
      if (paramTarget.kind === 'block') {
        const block = routine?.routine_blocks.find((b) => b.id === paramTarget.blockId);
        await addBlockExercise({
          block_id: paramTarget.blockId,
          exercise_id: paramTarget.exerciseId,
          sets: value.sets,
          reps: value.reps,
          rest_seconds: value.restSeconds,
          peso_kg: value.pesoKg,
          position: block?.routine_block_exercises.length ?? 0,
        });
      } else {
        await updateBlockExercise(paramTarget.rbe.id, {
          sets: value.sets,
          reps: value.reps,
          rest_seconds: value.restSeconds,
          peso_kg: value.pesoKg,
        });
      }
      setParamTarget(null);
      await load();
    } catch (e) {
      console.warn(e);
      Alert.alert(t('common.error'), friendlyError(e, 'perfil.noSePudieronGuardar'));
    } finally {
      setParamSaving(false);
    }
  }

  // ---------- Plan semanal ----------

  function scheduledWeekdayOf(blockId: number): number | null {
    return schedule.find((s) => s.block_id === blockId)?.weekday ?? null;
  }

  function blockOfWeekday(weekday: number): RoutineBlock | null {
    const row = schedule.find((x) => x.weekday === weekday);
    if (!row) return null;
    return routine?.routine_blocks.find((b) => b.id === row.block_id) ?? null;
  }

  async function handleSetDay(block: RoutineBlock, weekday: number) {
    if (!userId || busy) return;
    const currently = scheduledWeekdayOf(block.id);
    setBusy(true);
    try {
      if (currently === weekday) {
        await clearBlockDay(userId, block.id);
      } else {
        await setBlockDay(userId, block.id, weekday);
      }
      await load();
    } catch (e) {
      console.warn(e);
      Alert.alert(
        t('admin.noSePudoGuardar'),
        friendlyError(e, 'admin.errorAsignacionDia')
      );
    } finally {
      setBusy(false);
    }
  }

  // ---------- Rutina ----------

  function addDraftBlock() {
    setDraftError(null);
    setDraftBlocks((blocks) => [
      ...blocks,
      { key: Date.now() + Math.random(), name: '', region: 'full', exercises: [] },
    ]);
  }

  function removeDraftBlock(key: number) {
    setDraftBlocks((blocks) => blocks.filter((b) => b.key !== key));
  }

  function patchDraftBlock(key: number, patch: Partial<DraftBlock>) {
    setDraftBlocks((blocks) => blocks.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  }

  function removeDraftExercise(blockKey: number, exerciseId: number) {
    setDraftBlocks((blocks) =>
      blocks.map((b) =>
        b.key === blockKey
          ? { ...b, exercises: b.exercises.filter((e) => e.exerciseId !== exerciseId) }
          : b
      )
    );
  }

  async function handleCreateRoutine() {
    if (!me || !userId) return;
    const title = newTitle.trim();
    const blocks = draftBlocks.filter((b) => b.name.trim());
    setDraftError(null);
    setDraftOk(null);
    if (!title) {
      setDraftError(t('admin.rutinaSinNombre'));
      return;
    }
    if (!blocks.length) {
      setDraftError(t('admin.rutinaSinBloques'));
      return;
    }
    if (blocks.some((b) => b.exercises.some((e) => e.sets == null || !e.reps))) {
      setDraftError(t('admin.faltanSeriesReps'));
      return;
    }
    if (!client || client.profe_id !== me.id) {
      setDraftError(t('admin.alumnoNoAsignado'));
      return;
    }
    setBusy(true);
    try {
      await createRoutineFull({
        cliente_id: userId,
        title,
        description: newDescription.trim() || null,
        blocks: blocks.map((b) => ({
          name: b.name,
          region: b.region,
          exercises: b.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            sets: e.sets,
            reps: e.reps,
            restSeconds: e.restSeconds,
            pesoKg: e.pesoKg,
          })),
        })),
      });
      setNewTitle('');
      setNewDescription('');
      setDraftBlocks([]);
      setDraftOk(
        t(blocks.length === 1 ? 'admin.rutinaCreadaUna' : 'admin.rutinaCreadaVarias', {
          count: blocks.length,
        })
      );
      await load();
    } catch (e) {
      console.warn(e);
      setDraftError(friendlyError(e, 'admin.errorCrearRutina'));
    } finally {
      setBusy(false);
    }
  }

  async function handleAddBlock() {
    if (!routine || !newBlockName.trim()) return;
    setBusy(true);
    try {
      await createBlock({
        routine_id: routine.id,
        name: newBlockName.trim(),
        region: newBlockRegion,
        position: routine.routine_blocks.length,
      });
      setNewBlockName('');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteBlock(blockId: number) {
    Alert.alert(t('common.eliminarBloque'), t('common.confirmarEliminarBloque'), [
      { text: t('common.cancelar'), style: 'cancel' },
      {
        text: t('common.eliminar'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBlock(blockId);
            await load();
          } catch (e) {
            console.warn(e);
          }
        },
      },
    ]);
  }

  async function handleDeleteExercise(rbeId: number) {
    try {
      await deleteBlockExercise(rbeId);
      await load();
    } catch (e) {
      console.warn(e);
    }
  }

  async function handleDeleteRoutine() {
    if (!routine) return;
    Alert.alert(t('common.eliminarRutina'), t('common.confirmarEliminarRutina'), [
      { text: t('common.cancelar'), style: 'cancel' },
      {
        text: t('common.eliminar'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRoutine(routine.id);
            setRoutine(null);
            await load();
          } catch (e) {
            console.warn(e);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={theme.brandBright} style={styles.loader} />
      </Screen>
    );
  }

  if (!client) {
    return (
      <Screen>
        <EmptyState
          icon="account-search-outline"
          title={t('admin.alumnoNoEncontrado')}
          subtitle={t('admin.alumnoNoEncontradoSubtitulo')}
        />
      </Screen>
    );
  }

  const edad = computeEdad(details?.fecha_nacimiento ?? null);

  return (
    <Screen>
      {/* Datos del alumno */}
      <View style={styles.header}>
        <ThemedText type="eyebrow" themeColor="text">
          {t('admin.fichaAlumno')}
        </ThemedText>
        <ThemedText type="display">{client.name ?? client.email}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {client.email}
        </ThemedText>
      </View>

      <Card>
        <View style={styles.metaGrid}>
          <Meta
            label={t('admin.edad')}
            value={edad != null ? t('admin.edadAnios', { edad }) : '—'}
          />
          <Meta label={t('perfil.altura')} value={details?.altura_cm != null ? `${details.altura_cm} cm` : '—'} />
          <Meta label={t('perfil.peso')} value={details?.peso_kg != null ? `${details.peso_kg} kg` : '—'} />
          <Meta label={t('admin.nivel')} value={experienciaLabel(locale, details?.experiencia ?? null)} />
        </View>
        <View style={styles.metaGrid}>
          <Meta label={t('perfil.objetivo')} value={details?.objetivo ?? '—'} wide />
        </View>
        {details?.enfermedades?.length ? (
          <Meta label={t('perfil.enfermedades')} value={details.enfermedades.join(', ')} wide />
        ) : null}
        {details?.lesiones?.length ? (
          <Meta label={t('perfil.lesiones')} value={details.lesiones.join(', ')} wide />
        ) : null}
      </Card>

      {/* Avance */}
      <Card>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          {t('admin.avance')}
        </ThemedText>
        <View style={styles.statsRow}>
          <View style={styles.flex}>
            <StatCard
              icon="calendar-check-outline"
              value={String(sessions.length)}
              label={t('inicio.entrenamientos')}
            />
          </View>
          <View style={styles.flex}>
            <StatCard
              icon="timer-outline"
              value={formatMinutes(locale, sessions.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0))}
              label={t('inicio.tiempoTotal')}
            />
          </View>
        </View>
        {sessions.slice(0, 5).map((s) => (
          <ThemedText key={s.id} type="small" themeColor="textSecondary">
            {formatDateTime(s.completed_on, locale)}
            {s.duration_minutes != null ? ` · ${formatMinutes(locale, s.duration_minutes)}` : ''}
          </ThemedText>
        ))}
      </Card>

      {/* Rutina */}
      <ThemedText type="eyebrow" themeColor="textSecondary">
        {t('nav.rutina')}
      </ThemedText>

      {!routine ? (
        <Card>
          <ThemedText type="eyebrow" themeColor="text">
            {t('admin.nuevaRutina')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('admin.nuevaRutinaSubtitulo')}
          </ThemedText>

          <Field
            label={t('common.titulo')}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder={t('common.tituloPlaceholder')}
          />
          <Field
            label={t('common.descripcionOpcional')}
            value={newDescription}
            onChangeText={setNewDescription}
            placeholder={t('common.descripcionPlaceholder')}
          />

          {draftBlocks.length ? (
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('admin.bloques', { count: draftBlocks.length })}
            </ThemedText>
          ) : null}

          {draftBlocks.map((block, index) => (
            <View key={block.key} style={styles.draftBlock}>
              <View style={styles.headerRow}>
                <ThemedText type="smallBold" themeColor="text">
                  {t('common.bloqueNum', { num: index + 1 })}
                </ThemedText>
                <IconAction
                  icon="trash-can-outline"
                  label={t('common.quitarBloque')}
                  color={theme.danger}
                  onPress={() => removeDraftBlock(block.key)}
                />
              </View>

              <Field
                label={t('common.nombreBloque')}
                value={block.name}
                onChangeText={(value) => patchDraftBlock(block.key, { name: value })}
                placeholder={t('common.nombreBloquePlaceholder')}
              />

              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('admin.zonaCuerpo')}
              </ThemedText>
              <View style={styles.chipsRow}>
                {regions(locale).map((r) => (
                  <Chip
                    key={r.value}
                    label={r.label}
                    selected={block.region === r.value}
                    onPress={() => patchDraftBlock(block.key, { region: r.value })}
                  />
                ))}
              </View>

              {block.exercises.length ? (
                <View style={styles.selectedList}>
                  {block.exercises.map((draft) => {
                    const ex = exercises.find((e) => e.id === draft.exerciseId);
                    return (
                      <View key={draft.exerciseId} style={styles.selectedRow}>
                        <View style={styles.flex}>
                          <ThemedText type="small">{ex?.name ?? t('admin.ejercicio')}</ThemedText>
                          <ParamLine rbe={draftToRbe(draft)} />
                        </View>
                        <IconAction
                          icon="pencil-outline"
                          label={t('common.editar')}
                          color={theme.brandBright}
                          onPress={() =>
                            openDraftExercise(
                              block.key,
                              draft.exerciseId,
                              ex?.name ?? t('admin.ejercicio'),
                              draft
                            )
                          }
                        />
                        <IconAction
                          icon="trash-can-outline"
                          label={t('common.quitar')}
                          color={theme.danger}
                          onPress={() => removeDraftExercise(block.key, draft.exerciseId)}
                        />
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <ThemedText type="smallBold" themeColor="text">
                {t('admin.ejercicios', { count: block.exercises.length })}
              </ThemedText>

              {muscleGroups.map((mg) => {
                const groupExercises = exercises.filter((ex) => ex.muscle_group_id === mg.id);
                if (!groupExercises.length) return null;
                const anySelected = block.exercises.some((de) =>
                  groupExercises.some((ex) => ex.id === de.exerciseId)
                );
                return (
                  <View key={mg.id} style={styles.exGroup}>
                    <ThemedText
                      type="smallBold"
                      themeColor={anySelected ? 'text' : 'textSecondary'}>
                      {mg.name}
                    </ThemedText>
                    {groupExercises.map((ex) => {
                      const added = block.exercises.find((de) => de.exerciseId === ex.id);
                      return (
                        <Pressable
                          key={ex.id}
                          onPress={() => openDraftExercise(block.key, ex.id, ex.name, added)}
                          style={({ pressed }) => [styles.exRow, pressed && styles.pressed]}>
                          <MaterialCommunityIcons
                            name={added ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                            size={22}
                            color={added ? theme.teal : theme.textSecondary}
                          />
                          <ThemedText type="small" style={styles.flex}>
                            {ex.name}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          ))}

          <Button
            variant="outline"
            label={t('admin.agregarBloque')}
            icon="plus-box-outline"
            onPress={addDraftBlock}
          />

          {draftError ? <ThemedText themeColor="danger">{draftError}</ThemedText> : null}
          {draftOk ? <ThemedText themeColor="success">{draftOk}</ThemedText> : null}

          <Button
            label={t('admin.crearRutina')}
            icon="check"
            onPress={handleCreateRoutine}
            loading={busy}
          />
        </Card>
      ) : (
        <Card>
          <View style={styles.headerRow}>
            <View style={styles.flex}>
              <ThemedText type="default">{routine.title}</ThemedText>
              {routine.description ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {routine.description}
                </ThemedText>
              ) : null}
            </View>
            <IconAction
              icon="trash-can-outline"
              label={t('common.eliminarRutina')}
              color={theme.danger}
              onPress={handleDeleteRoutine}
            />
          </View>

          <ThemedText type="smallBold" themeColor="textSecondary">
            {t('admin.planSemanal')}
          </ThemedText>
          <View style={styles.weekList}>
            {Array.from({ length: 7 }, (_, weekday) => {
              const block = blockOfWeekday(weekday);
              return (
                <View key={weekday} style={styles.weekRow}>
                  <ThemedText
                    type="small"
                    themeColor={block ? 'text' : 'textSecondary'}
                    style={styles.weekDay}>
                    {weekdayLabel(locale, weekday)}
                  </ThemedText>
                  <ThemedText type="small" themeColor={block ? 'brandBright' : 'textSecondary'}>
                    {block ? block.name : t('common.libreDescanso')}
                  </ThemedText>
                </View>
              );
            })}
          </View>

          <ThemedText type="smallBold" themeColor="textSecondary">
            {t('admin.bloquesProgramados')}
          </ThemedText>

          {routine.routine_blocks.map((block, index) => (
            <Card key={block.id} style={styles.blockBox} tone="flat">
              <View style={styles.headerRow}>
                <View style={styles.flex}>
                  <ThemedText type="smallBold" themeColor="text">
                    {t('common.bloqueRegion', {
                      num: index + 1,
                      region: regionLabel(locale, block.region),
                    })}
                  </ThemedText>
                  <ThemedText type="default">{block.name}</ThemedText>
                </View>
                <IconAction
                  icon="trash-can-outline"
                  label={t('common.eliminarBloque')}
                  color={theme.danger}
                  onPress={() => handleDeleteBlock(block.id)}
                />
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
                      disabled={busy}
                      onPress={() => handleSetDay(block, weekday)}
                    />
                  ))}
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {scheduledWeekdayOf(block.id) == null
                    ? t('admin.sinDiaAsignado')
                    : t('admin.tocaMismoDia')}
                </ThemedText>
              </View>

              {block.routine_block_exercises.map((rbe) => (
                <View key={rbe.id} style={styles.exerciseRow}>
                  <View style={styles.flex}>
                    <ThemedText type="default">{rbe.exercises?.name}</ThemedText>
                    <ParamLine rbe={rbe} />
                  </View>
                  <IconAction
                    icon="pencil-outline"
                    label={t('common.editar')}
                    color={theme.brandBright}
                    onPress={() => openEditRbe(rbe)}
                  />
                  <IconAction
                    icon="trash-can-outline"
                    label={t('common.quitar')}
                    color={theme.danger}
                    onPress={() =>
                      Alert.alert(rbe.exercises?.name ?? t('admin.ejercicio'), t('common.confirmarQuitarEjercicio'), [
                        { text: t('common.cancelar'), style: 'cancel' },
                        {
                          text: t('common.quitar'),
                          style: 'destructive',
                          onPress: () => handleDeleteExercise(rbe.id),
                        },
                      ])
                    }
                  />
                </View>
              ))}

              {pickerBlock === block.id ? (
                <View style={styles.picker}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {t('admin.elegiMusculo')}
                  </ThemedText>
                  <View style={styles.chipsRow}>
                    {muscleGroups.map((mg) => (
                      <Chip
                        key={mg.id}
                        label={mg.name}
                        selected={pickerMuscle === mg.id}
                        onPress={() => setPickerMuscle(mg.id)}
                      />
                    ))}
                  </View>
                  {exercises
                    .filter((ex) => pickerMuscle == null || ex.muscle_group_id === pickerMuscle)
                    .map((ex) => (
                      <View key={ex.id} style={styles.addRow}>
                        <View style={styles.flex}>
                          <ThemedText type="small">{ex.name}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {ex.muscle_groups?.name}
                          </ThemedText>
                        </View>
                        <Button
                          variant="outline"
                          label={t('common.agregar')}
                          disabled={busy}
                          onPress={() => openAddToBlock(block.id, ex)}
                        />
                      </View>
                    ))}
                  {!exercises.length ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('admin.catalogoVacio')}
                    </ThemedText>
                  ) : null}
                </View>
              ) : (
                <Button
                  variant="outline"
                  label={t('admin.agregarEjercicio')}
                  onPress={() => {
                    setPickerBlock(block.id);
                    setPickerMuscle(null);
                  }}
                />
              )}
            </Card>
          ))}

          <ThemedText type="smallBold" themeColor="textSecondary">
            {t('admin.agregarBloque')}
          </ThemedText>
          <Field
            label={t('common.nombreBloque')}
            value={newBlockName}
            onChangeText={setNewBlockName}
            placeholder={t('common.nombreBloquePlaceholder')}
          />
          <View style={styles.chipsRow}>
            {regions(locale).map((r) => (
              <Chip
                key={r.value}
                label={r.label}
                selected={newBlockRegion === r.value}
                onPress={() => setNewBlockRegion(r.value)}
              />
            ))}
          </View>
          <Button label={t('admin.agregarBloque')} onPress={handleAddBlock} loading={busy} />
        </Card>
      )}

      {paramTarget ? (
        <ExerciseParamsSheet
          title={
            paramTarget.kind === 'rbe'
              ? `${t('admin.editarParametros')} · ${paramTarget.name}`
              : `${t('admin.configurarEjercicio')} · ${paramTarget.name}`
          }
          initial={paramInitial}
          saving={paramSaving}
          onCancel={() => setParamTarget(null)}
          onSave={handleSaveParams}
        />
      ) : null}
    </Screen>
  );
}

/** Un borrador se puede pintar con el mismo formateador que una fila real. */
function draftToRbe(draft: DraftExercise): Pick<RoutineBlockExercise, 'sets' | 'reps' | 'rest_seconds' | 'peso_kg'> {
  return {
    sets: draft.sets,
    reps: draft.reps,
    rest_seconds: draft.restSeconds,
    peso_kg: draft.pesoKg,
  };
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.five },
  header: { gap: Spacing.one },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  meta: { minWidth: 90, gap: 2 },
  metaWide: { width: '100%', gap: 2 },
  statsRow: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.two },
  flex: { flex: 1, minWidth: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  blockBox: { gap: Spacing.two },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  group: { gap: Spacing.two },
  weekList: { gap: Spacing.one },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  weekDay: { fontWeight: '700' },
  picker: { gap: Spacing.two, paddingTop: Spacing.two },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pressed: { opacity: 0.7 },
  draftBlock: {
    gap: Spacing.md,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1C3E6B',
  },
  exGroup: { gap: Spacing.one },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  selectedList: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
