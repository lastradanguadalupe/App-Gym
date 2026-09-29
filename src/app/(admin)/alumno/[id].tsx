import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

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
  WEEKDAYS_SHORT,
  computeEdad,
  experienciaLabel,
  formatDateTime,
  formatMinutes,
  regionLabel,
  weekdayLabel,
} from '@/lib/format';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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

const REGIONS: { value: Region; label: string }[] = [
  { value: 'superior', label: 'Tren superior' },
  { value: 'inferior', label: 'Tren inferior' },
  { value: 'core', label: 'Core' },
  { value: 'full', label: 'Cuerpo completo' },
];

type DraftBlock = {
  key: number;
  name: string;
  region: Region;
  exerciseIds: number[];
};

function errMsg(e: unknown): string {
  const obj = e as { message?: string; details?: string; hint?: string; code?: string };
  if (obj?.code || obj?.message) {
    let msg = obj.message ?? 'Supabase';
    if (obj.details) msg += ` · ${obj.details}`;
    if (obj.hint) msg += ` · ${obj.hint}`;
    if (obj.code) msg += ` (${obj.code})`;
    return msg;
  }
  return e instanceof Error ? e.message : JSON.stringify(e);
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

export default function AdminAlumnoScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { profile: me } = useSession();
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
  const [editingRbe, setEditingRbe] = useState<number | null>(null);
  const [editSets, setEditSets] = useState('3');
  const [editReps, setEditReps] = useState('10-12');
  const [editRest, setEditRest] = useState('60');

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
      Alert.alert('No se pudo guardar', `Revisá la asignación del día. (${errMsg(e)})`);
    } finally {
      setBusy(false);
    }
  }

  // ---------- Rutina ----------

  function addDraftBlock() {
    setDraftError(null);
    setDraftBlocks((blocks) => [
      ...blocks,
      { key: Date.now() + Math.random(), name: '', region: 'full', exerciseIds: [] },
    ]);
  }

  function removeDraftBlock(key: number) {
    setDraftBlocks((blocks) => blocks.filter((b) => b.key !== key));
  }

  function patchDraftBlock(key: number, patch: Partial<DraftBlock>) {
    setDraftBlocks((blocks) => blocks.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  }

  function toggleDraftExercise(key: number, id: number) {
    setDraftBlocks((blocks) =>
      blocks.map((b) =>
        b.key === key
          ? {
              ...b,
              exerciseIds: b.exerciseIds.includes(id)
                ? b.exerciseIds.filter((x) => x !== id)
                : [...b.exerciseIds, id],
            }
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
      setDraftError('Poné un nombre para la rutina.');
      return;
    }
    if (!blocks.length) {
      setDraftError('Agregá al menos un bloque con su nombre y algunos ejercicios.');
      return;
    }
    if (!client || client.profe_id !== me.id) {
      setDraftError('Este alumno no está asignado a tu cuenta. Entrá al panel, buscalo y tocá "Agregar".');
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
          exerciseIds: b.exerciseIds,
        })),
      });
      setNewTitle('');
      setNewDescription('');
      setDraftBlocks([]);
      setDraftOk(`Rutina creada con ${blocks.length} bloque${blocks.length === 1 ? '' : 's'}.`);
      await load();
    } catch (e) {
      console.warn(e);
      setDraftError(`No se pudo crear la rutina. (${errMsg(e)})`);
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
    Alert.alert('Eliminar bloque', '¿Seguro que querés eliminar este bloque?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
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

  async function handleAddExercise(blockId: number, exerciseId: number) {
    setBusy(true);
    try {
      const block = routine?.routine_blocks.find((b) => b.id === blockId);
      await addBlockExercise({
        block_id: blockId,
        exercise_id: exerciseId,
        sets: 3,
        reps: '10-12',
        rest_seconds: 60,
        position: block?.routine_block_exercises.length ?? 0,
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteExercise(rbeId: number) {
    try {
      await deleteBlockExercise(rbeId);
      await load();
    } catch (e) {
      console.warn(e);
    }
  }

  function openEditRbe(rbe: RoutineBlockExercise) {
    setEditSets(String(rbe.sets));
    setEditReps(rbe.reps);
    setEditRest(String(rbe.rest_seconds));
    setEditingRbe(rbe.id);
  }

  async function handleSaveRbe(rbe: RoutineBlockExercise) {
    const sets = Number(editSets);
    const rest = Number(editRest);
    if (!Number.isFinite(sets) || sets < 1 || !Number.isFinite(rest) || rest < 0) {
      Alert.alert('Revisá los valores', 'Series y descanso deben ser números válidos.');
      return;
    }
    setBusy(true);
    try {
      await updateBlockExercise(rbe.id, {
        sets,
        reps: editReps.trim() || '10-12',
        rest_seconds: rest,
      });
      setEditingRbe(null);
      await load();
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'No se pudieron guardar los cambios.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteRoutine() {
    if (!routine) return;
    Alert.alert('Eliminar rutina', '¿Seguro que querés eliminar toda la rutina del alumno?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
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
          title="Alumno no encontrado"
          subtitle="Volvé al listado y elegí un alumno."
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
          Ficha del alumno
        </ThemedText>
        <ThemedText type="display">{client.name ?? client.email}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {client.email}
        </ThemedText>
      </View>

      <Card>
        <View style={styles.metaGrid}>
          <Meta label="Edad" value={edad != null ? `${edad} años` : '—'} />
          <Meta label="Altura" value={details?.altura_cm != null ? `${details.altura_cm} cm` : '—'} />
          <Meta label="Peso" value={details?.peso_kg != null ? `${details.peso_kg} kg` : '—'} />
          <Meta label="Nivel" value={experienciaLabel(details?.experiencia ?? null)} />
        </View>
        <View style={styles.metaGrid}>
          <Meta label="Objetivo" value={details?.objetivo ?? '—'} wide />
        </View>
        {details?.enfermedades?.length ? (
          <Meta label="Enfermedades" value={details.enfermedades.join(', ')} wide />
        ) : null}
        {details?.lesiones?.length ? (
          <Meta label="Lesiones" value={details.lesiones.join(', ')} wide />
        ) : null}
      </Card>

      {/* Avance */}
      <Card>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          Avance
        </ThemedText>
        <View style={styles.statsRow}>
          <View style={styles.flex}>
            <StatCard
              icon="calendar-check-outline"
              value={String(sessions.length)}
              label="Entrenamientos"
            />
          </View>
          <View style={styles.flex}>
            <StatCard
              icon="timer-outline"
              value={formatMinutes(sessions.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0))}
              label="Tiempo total"
            />
          </View>
        </View>
        {sessions.slice(0, 5).map((s) => (
          <ThemedText key={s.id} type="small" themeColor="textSecondary">
            {formatDateTime(s.completed_on)}
            {s.duration_minutes != null ? ` · ${formatMinutes(s.duration_minutes)}` : ''}
          </ThemedText>
        ))}
      </Card>

      {/* Rutina */}
      <ThemedText type="eyebrow" themeColor="textSecondary">
        Rutina
      </ThemedText>

      {!routine ? (
        <Card>
          <ThemedText type="eyebrow" themeColor="text">
            Nueva rutina
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Armá la primera versión con bloques y ejercicios del catálogo. Después podés seguir
            editándola cuando quieras.
          </ThemedText>

          <Field
            label="Título"
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="Ej: Rutina de hipertrofia"
          />
          <Field
            label="Descripción (opcional)"
            value={newDescription}
            onChangeText={setNewDescription}
            placeholder="Un par de líneas de contexto..."
          />

          {draftBlocks.length ? (
            <ThemedText type="smallBold" themeColor="textSecondary">
              Bloques ({draftBlocks.length})
            </ThemedText>
          ) : null}

          {draftBlocks.map((block, index) => (
            <View key={block.key} style={styles.draftBlock}>
              <View style={styles.headerRow}>
                <ThemedText type="smallBold" themeColor="text">
                  Bloque {index + 1}
                </ThemedText>
                <IconAction
                  icon="trash-can-outline"
                  label="Quitar bloque"
                  color={theme.danger}
                  onPress={() => removeDraftBlock(block.key)}
                />
              </View>

              <Field
                label="Nombre del bloque"
                value={block.name}
                onChangeText={(t) => patchDraftBlock(block.key, { name: t })}
                placeholder="Ej: Tren superior"
              />

              <ThemedText type="smallBold" themeColor="textSecondary">
                Zona del cuerpo
              </ThemedText>
              <View style={styles.chipsRow}>
                {REGIONS.map((r) => (
                  <Chip
                    key={r.value}
                    label={r.label}
                    selected={block.region === r.value}
                    onPress={() => patchDraftBlock(block.key, { region: r.value })}
                  />
                ))}
              </View>

              <ThemedText type="smallBold" themeColor="text">
                Ejercicios ({block.exerciseIds.length})
              </ThemedText>

              {muscleGroups.map((mg) => {
                const groupExercises = exercises.filter((ex) => ex.muscle_group_id === mg.id);
                if (!groupExercises.length) return null;
                const anySelected = block.exerciseIds.some((id) =>
                  groupExercises.some((ex) => ex.id === id)
                );
                return (
                  <View key={mg.id} style={styles.exGroup}>
                    <ThemedText
                      type="smallBold"
                      themeColor={anySelected ? 'text' : 'textSecondary'}>
                      {mg.name}
                    </ThemedText>
                    {groupExercises.map((ex) => {
                      const selected = block.exerciseIds.includes(ex.id);
                      return (
                        <Pressable
                          key={ex.id}
                          onPress={() => toggleDraftExercise(block.key, ex.id)}
                          style={({ pressed }) => [styles.exRow, pressed && styles.pressed]}>
                          <MaterialCommunityIcons
                            name={selected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                            size={22}
                            color={selected ? theme.teal : theme.textSecondary}
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
            label="Agregar bloque"
            icon="plus-box-outline"
            onPress={addDraftBlock}
          />

          {draftError ? <ThemedText themeColor="danger">{draftError}</ThemedText> : null}
          {draftOk ? <ThemedText themeColor="success">{draftOk}</ThemedText> : null}

          <Button
            label="Crear rutina"
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
              label="Quitar rutina"
              color={theme.danger}
              onPress={handleDeleteRoutine}
            />
          </View>

          <ThemedText type="smallBold" themeColor="textSecondary">
            Plan semanal
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
                    {weekdayLabel(weekday)}
                  </ThemedText>
                  <ThemedText type="small" themeColor={block ? 'brandBright' : 'textSecondary'}>
                    {block ? block.name : 'Libre / Descanso'}
                  </ThemedText>
                </View>
              );
            })}
          </View>

          <ThemedText type="smallBold" themeColor="textSecondary">
            Bloques (cada uno se programa en un día de la semana)
          </ThemedText>

          {routine.routine_blocks.map((block, index) => (
            <Card key={block.id} style={styles.blockBox} tone="flat">
              <View style={styles.headerRow}>
                <View style={styles.flex}>
                  <ThemedText type="smallBold" themeColor="text">
                    Bloque {index + 1} · {regionLabel(block.region)}
                  </ThemedText>
                  <ThemedText type="default">{block.name}</ThemedText>
                </View>
                <IconAction
                  icon="trash-can-outline"
                  label="Eliminar bloque"
                  color={theme.danger}
                  onPress={() => handleDeleteBlock(block.id)}
                />
              </View>

              <View style={styles.group}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Día de la semana
                </ThemedText>
                <View style={styles.chipsRow}>
                  {WEEKDAYS_SHORT.map((label, weekday) => (
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
                    ? 'Sin día asignado: el alumno lo ve como libre.'
                    : 'Tocá el mismo día para dejarlo libre.'}
                </ThemedText>
              </View>

              {block.routine_block_exercises.map((rbe) => (
                <View key={rbe.id}>
                  <View style={styles.exerciseRow}>
                    <View style={styles.flex}>
                      <ThemedText type="default">{rbe.exercises?.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {rbe.sets} × {rbe.reps} · {rbe.rest_seconds}s ·{' '}
                        {rbe.exercises?.muscle_groups?.name}
                      </ThemedText>
                    </View>
                    {editingRbe === rbe.id ? (
                      <IconAction
                        icon="close"
                        label="Cerrar"
                        color={theme.textSecondary}
                        onPress={() => setEditingRbe(null)}
                      />
                    ) : (
                      <>
                        <IconAction
                          icon="pencil-outline"
                          label="Editar"
                          color={theme.brandBright}
                          onPress={() => openEditRbe(rbe)}
                        />
                        <IconAction
                          icon="trash-can-outline"
                          label="Quitar"
                          color={theme.danger}
                          onPress={() =>
                            Alert.alert(rbe.exercises?.name ?? 'Ejercicio', '¿Quitar este ejercicio?', [
                              { text: 'Cancelar', style: 'cancel' },
                              { text: 'Quitar', style: 'destructive', onPress: () => handleDeleteExercise(rbe.id) },
                            ])
                          }
                        />
                      </>
                    )}
                  </View>

                  {editingRbe === rbe.id ? (
                    <View style={styles.editBox}>
                      <View style={styles.rowThree}>
                        <View style={styles.flex}>
                          <Field label="Series" value={editSets} onChangeText={setEditSets} keyboardType="number-pad" />
                        </View>
                        <View style={styles.flex}>
                          <Field label="Reps" value={editReps} onChangeText={setEditReps} placeholder="10-12" />
                        </View>
                        <View style={styles.flex}>
                          <Field label="Descanso (s)" value={editRest} onChangeText={setEditRest} keyboardType="number-pad" />
                        </View>
                      </View>
                      <Button
                        variant="outline"
                        label="Guardar"
                        icon="content-save-outline"
                        disabled={busy}
                        onPress={() => handleSaveRbe(rbe)}
                      />
                    </View>
                  ) : null}
                </View>
              ))}

              {pickerBlock === block.id ? (
                <View style={styles.picker}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Elegí un músculo y agregá ejercicios
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
                          label="Agregar"
                          disabled={busy}
                          onPress={() => handleAddExercise(block.id, ex.id)}
                        />
                      </View>
                    ))}
                  {!exercises.length ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Todavía no hay ejercicios en el catálogo. Cargalos desde “Catálogo de
                      ejercicios”.
                    </ThemedText>
                  ) : null}
                </View>
              ) : (
                <Button
                  variant="outline"
                  label="Agregar ejercicio"
                  onPress={() => {
                    setPickerBlock(block.id);
                    setPickerMuscle(null);
                  }}
                />
              )}
            </Card>
          ))}

          <ThemedText type="smallBold" themeColor="textSecondary">
            Agregar bloque
          </ThemedText>
          <Field label="Nombre del bloque" value={newBlockName} onChangeText={setNewBlockName} placeholder="Ej: Tren superior" />
          <View style={styles.chipsRow}>
            {REGIONS.map((r) => (
              <Chip
                key={r.value}
                label={r.label}
                selected={newBlockRegion === r.value}
                onPress={() => setNewBlockRegion(r.value)}
              />
            ))}
          </View>
          <Button label="Agregar bloque" onPress={handleAddBlock} loading={busy} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.five },
  header: { gap: Spacing.one },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  meta: { minWidth: 90, gap: 2 },
  metaWide: { width: '100%', gap: 2 },
  statsRow: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.two },
  flex: { flex: 1 },
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
  editBox: { gap: Spacing.two, paddingTop: Spacing.two },
  rowThree: { flexDirection: 'row', gap: Spacing.two },
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
});