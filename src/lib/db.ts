import { supabase } from '@/lib/supabase';
import type {
  ClientDetails,
  Exercise,
  MuscleGroup,
  MotivationalPhrase,
  NutritionTip,
  Profile,
  Routine,
  RoutineBlock,
  RoutineBlockExercise,
  RoutineSchedule,
  WorkoutSession,
  Region,
} from '@/types';

function dataOrThrow<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error || data == null) {
    throw error ? (error as Error) : new Error('Sin datos');
  }
  return data;
}

// ---------- Perfil y cuestionario ----------

export async function fetchProfile(uid: string): Promise<Profile> {
  const res = await supabase.from('profiles').select('*').eq('id', uid).single();
  return dataOrThrow<Profile>(res);
}

export async function fetchClientDetails(uid: string): Promise<ClientDetails | null> {
  const res = await supabase.from('client_details').select('*').eq('user_id', uid).maybeSingle();
  if (res.error) throw res.error;
  return (res.data as ClientDetails | null) ?? null;
}

export type ClientDetailsInput = Partial<Omit<ClientDetails, 'id' | 'created_at' | 'updated_at'>>;

export async function upsertClientDetails(uid: string, input: ClientDetailsInput): Promise<void> {
  const existing = await fetchClientDetails(uid);
  if (existing) {
    const res = await supabase.from('client_details').update(input).eq('user_id', uid);
    if (res.error) throw res.error;
  } else {
    const res = await supabase.from('client_details').insert({ user_id: uid, ...input });
    if (res.error) throw res.error;
  }
}

export async function updateProfileName(uid: string, name: string): Promise<void> {
  const res = await supabase.from('profiles').update({ name }).eq('id', uid);
  if (res.error) throw res.error;
}

/** Alumnos asignados al profe (nunca el directorio global). */
export async function fetchAlumnos(profeId: string): Promise<Profile[]> {
  const res = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'cliente')
    .eq('profe_id', profeId)
    .order('name');
  return dataOrThrow<Profile[]>(res);
}

/** Búsqueda por nombre (y apellido) o email para asignar un alumno nuevo (RPC, solo profe). */
export async function searchClients(query: string): Promise<Pick<Profile, 'id' | 'email' | 'name'>[]> {
  const res = await supabase.rpc('search_clients', { query });
  if (res.error) throw res.error;
  return (res.data as Pick<Profile, 'id' | 'email' | 'name'>[]) ?? [];
}

export async function assignProfe(target: string): Promise<void> {
  const res = await supabase.rpc('assign_profe', { target });
  if (res.error) throw res.error;
}

// ---------- Catálogo ----------

export async function fetchMuscleGroups(): Promise<MuscleGroup[]> {
  const res = await supabase.from('muscle_groups').select('*').order('id');
  return dataOrThrow<MuscleGroup[]>(res);
}

export async function fetchExercises(): Promise<(Exercise & { muscle_groups: MuscleGroup })[]> {
  const res = await supabase
    .from('exercises')
    .select('*, muscle_groups(*)')
    .order('name');
  return dataOrThrow<Exercise[]>(res) as unknown as (Exercise & {
    muscle_groups: MuscleGroup;
  })[];
}

export async function fetchExercise(id: number): Promise<Exercise & { muscle_groups: MuscleGroup }> {
  const res = await supabase
    .from('exercises')
    .select('*, muscle_groups(*)')
    .eq('id', id)
    .single();
  return dataOrThrow<Exercise & { muscle_groups: MuscleGroup }>(res);
}

export async function createExercise(input: {
  muscle_group_id: number;
  name: string;
  instructions: string;
  image_url?: string | null;
}): Promise<void> {
  const res = await supabase.from('exercises').insert(input);
  if (res.error) throw res.error;
}

export async function deleteExercise(id: number): Promise<void> {
  const res = await supabase.from('exercises').delete().eq('id', id);
  if (res.error) throw res.error;
}

export async function updateExercise(
  id: number,
  input: { name?: string; instructions?: string | null; image_url?: string | null }
): Promise<void> {
  const res = await supabase.from('exercises').update(input).eq('id', id);
  if (res.error) throw res.error;
}

// ---------- Rutinas ----------

export interface RoutineFull extends Routine {
  routine_blocks: (RoutineBlock & { routine_block_exercises: RoutineBlockExercise[] })[];
}

export async function fetchActiveRoutineForClient(clientId: string): Promise<RoutineFull | null> {
  const res = await supabase
    .from('routines')
    .select('*, routine_blocks(*, routine_block_exercises(*, exercises(*, muscle_groups(*))))')
    .eq('cliente_id', clientId)
    .eq('is_active', true)
    .order('id', { referencedTable: 'routine_blocks', ascending: true })
    .order('position', { referencedTable: 'routine_blocks', ascending: true })
    .single();
  if (res.error) {
    if (res.error.code === 'PGRST116') return null;
    throw res.error;
  }
  return (res.data as RoutineFull) ?? null;
}

export async function fetchRoutinesForClient(clientId: string): Promise<RoutineFull[]> {
  const res = await supabase
    .from('routines')
    .select('*, routine_blocks(*, routine_block_exercises(*, exercises(*, muscle_groups(*))))')
    .eq('cliente_id', clientId)
    .order('created_at', { ascending: false });
  return dataOrThrow<RoutineFull[]>(res);
}

export async function fetchRoutineForProfe(routineId: number): Promise<RoutineFull> {
  const res = await supabase
    .from('routines')
    .select('*, routine_blocks(*, routine_block_exercises(*, exercises(*, muscle_groups(*))))')
    .eq('id', routineId)
    .order('position', { referencedTable: 'routine_blocks', ascending: true })
    .single();
  return dataOrThrow<RoutineFull>(res);
}

export async function createRoutine(input: {
  profe_id: string;
  cliente_id: string;
  title: string;
  description?: string | null;
}): Promise<number> {
  const res = await supabase.from('routines').insert(input).select('id').single();
  return dataOrThrow<{ id: number }>(res).id;
}

export async function createRoutineFull(input: {
  cliente_id: string;
  title: string;
  description?: string | null;
  blocks: { name: string; region: Region; exerciseIds: number[] }[];
}): Promise<number> {
  const res = await supabase.rpc('create_routine_full', {
    p_cliente_id: input.cliente_id,
    p_title: input.title,
    p_description: input.description ?? null,
    p_blocks: input.blocks.map((b) => ({
      name: b.name,
      region: b.region,
      exercise_ids: b.exerciseIds.map((id) => ({ id })),
    })),
  });
  if (res.error) throw res.error;
  return res.data as number;
}

export async function updateRoutine(
  id: number,
  input: { title?: string; description?: string | null; is_active?: boolean }
): Promise<void> {
  const res = await supabase.from('routines').update(input).eq('id', id);
  if (res.error) throw res.error;
}

export async function deleteRoutine(id: number): Promise<void> {
  const res = await supabase.from('routines').delete().eq('id', id);
  if (res.error) throw res.error;
}

export async function createBlock(input: {
  routine_id: number;
  name: string;
  region: string;
  position: number;
}): Promise<number> {
  const res = await supabase.rpc('create_block_in_routine', {
    p_routine_id: input.routine_id,
    p_name: input.name,
    p_region: input.region,
    p_position: input.position,
  });
  if (res.error) throw res.error;
  return res.data as number;
}

export async function deleteBlock(id: number): Promise<void> {
  const res = await supabase.from('routine_blocks').delete().eq('id', id);
  if (res.error) throw res.error;
}

export async function addBlockExercise(input: {
  block_id: number;
  exercise_id: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  position: number;
}): Promise<void> {
  const res = await supabase.rpc('add_exercise_to_block', {
    p_block_id: input.block_id,
    p_exercise_id: input.exercise_id,
    p_sets: input.sets,
    p_reps: input.reps,
    p_rest_seconds: input.rest_seconds,
    p_position: input.position,
  });
  if (res.error) throw res.error;
}

export async function deleteBlockExercise(id: number): Promise<void> {
  const res = await supabase.from('routine_block_exercises').delete().eq('id', id);
  if (res.error) throw res.error;
}

export async function updateBlockExercise(
  id: number,
  input: { sets?: number; reps?: string; rest_seconds?: number }
): Promise<void> {
  const res = await supabase.from('routine_block_exercises').update(input).eq('id', id);
  if (res.error) throw res.error;
}

// ---------- Programación semanal ----------

export async function fetchSchedule(clientId: string): Promise<RoutineSchedule[]> {
  const res = await supabase.from('routine_schedule').select('*').eq('client_id', clientId);
  return dataOrThrow<RoutineSchedule[]>(res);
}

export async function setBlockDay(clientId: string, blockId: number, weekday: number): Promise<void> {
  const res = await supabase.rpc('set_block_weekday', {
    p_client_id: clientId,
    p_block_id: blockId,
    p_weekday: weekday,
  });
  if (res.error) throw res.error;
}

export async function clearBlockDay(clientId: string, blockId: number): Promise<void> {
  const res = await supabase.rpc('clear_block_weekday', {
    p_client_id: clientId,
    p_block_id: blockId,
  });
  if (res.error) throw res.error;
}

// ---------- Sesiones (avance) ----------

export async function fetchSessions(clientId: string): Promise<(WorkoutSession & {
  routine_blocks: RoutineBlock | null;
})[]> {
  const res = await supabase
    .from('workout_sessions')
    .select('*, routine_blocks(id, name, region)')
    .eq('client_id', clientId)
    .order('completed_on', { ascending: false });
  return (res.data as (WorkoutSession & { routine_blocks: RoutineBlock | null })[]) ?? [];
}

export async function insertSession(input: {
  client_id: string;
  block_id?: number | null;
  routine_id?: number | null;
  weekday?: number | null;
  duration_minutes?: number | null;
  notes?: string | null;
}): Promise<number> {
  const res = await supabase.from('workout_sessions').insert(input).select('id').single();
  return dataOrThrow<{ id: number }>(res).id;
}

// ---------- Frases y tips ----------

function pick<T>(list: T[]): T | null {
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export async function fetchRandomPhrase(): Promise<MotivationalPhrase | null> {
  const res = await supabase
    .from('motivational_phrases')
    .select('*')
    .eq('is_active', true)
    .limit(50);
  if (res.error) throw res.error;
  return pick(res.data as MotivationalPhrase[]);
}

export async function fetchRandomTip(): Promise<NutritionTip | null> {
  const res = await supabase.from('nutrition_tips').select('*').eq('is_active', true).limit(50);
  if (res.error) throw res.error;
  return pick(res.data as NutritionTip[]);
}

export async function fetchPhrases(): Promise<MotivationalPhrase[]> {
  const res = await supabase.from('motivational_phrases').select('*').order('created_at');
  return dataOrThrow<MotivationalPhrase[]>(res);
}

export async function createPhrase(text: string): Promise<void> {
  const res = await supabase.from('motivational_phrases').insert({ text });
  if (res.error) throw res.error;
}

export async function deletePhrase(id: number): Promise<void> {
  const res = await supabase.from('motivational_phrases').delete().eq('id', id);
  if (res.error) throw res.error;
}

export async function fetchTips(): Promise<NutritionTip[]> {
  const res = await supabase.from('nutrition_tips').select('*').order('created_at');
  return dataOrThrow<NutritionTip[]>(res);
}

export async function createTip(input: { title: string; body: string }): Promise<void> {
  const res = await supabase.from('nutrition_tips').insert(input);
  if (res.error) throw res.error;
}

export async function deleteTip(id: number): Promise<void> {
  const res = await supabase.from('nutrition_tips').delete().eq('id', id);
  if (res.error) throw res.error;
}