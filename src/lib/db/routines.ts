import { supabase } from '@/lib/supabase';
import type { Region, Routine, RoutineBlock, RoutineBlockExercise } from '@/types';

import { dataOrThrow } from './shared';

const ROUTINE_SELECT = '*, routine_blocks(*, routine_block_exercises(*, exercises(*, muscle_groups(*))))';

export interface RoutineFull extends Routine {
  routine_blocks: (RoutineBlock & { routine_block_exercises: RoutineBlockExercise[] })[];
}

export async function fetchActiveRoutineForClient(clientId: string): Promise<RoutineFull | null> {
  const res = await supabase
    .from('routines')
    .select(ROUTINE_SELECT)
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
    .select(ROUTINE_SELECT)
    .eq('cliente_id', clientId)
    .order('created_at', { ascending: false });
  return dataOrThrow<RoutineFull[]>(res);
}

export async function fetchRoutineForProfe(routineId: number): Promise<RoutineFull> {
  const res = await supabase
    .from('routines')
    .select(ROUTINE_SELECT)
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

/** Parámetros de un ejercicio dentro de una rutina nueva. */
export type NewRoutineExercise = {
  exerciseId: number;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  pesoKg: number | null;
};

/**
 * Crea rutina, bloques y ejercicios en una sola transaccion (RPC).
 *
 * Cada ejercicio viaja con sus parámetros: no hay valores por defecto, y lo que
 * vaya `null` queda "sin definir" en la base.
 */
export async function createRoutineFull(input: {
  cliente_id: string;
  title: string;
  description?: string | null;
  blocks: { name: string; region: Region; exercises: NewRoutineExercise[] }[];
}): Promise<number> {
  const res = await supabase.rpc('create_routine_full', {
    p_cliente_id: input.cliente_id,
    p_title: input.title,
    p_description: input.description ?? null,
    p_blocks: input.blocks.map((b) => ({
      name: b.name,
      region: b.region,
      exercises: b.exercises.map((ex) => ({
        exercise_id: ex.exerciseId,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.restSeconds,
        peso_kg: ex.pesoKg,
      })),
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

/**
 * Agrega un ejercicio a un bloque con los parámetros que eligió el profe.
 *
 * No hay defaults: `sets` y `reps` son obligatorios (los valida el formulario y
 * el RPC), `rest_seconds` y `peso_kg` pueden ser `null` = sin definir.
 */
export async function addBlockExercise(input: {
  block_id: number;
  exercise_id: number;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  peso_kg: number | null;
  position: number;
}): Promise<void> {
  const res = await supabase.rpc('add_exercise_to_block', {
    p_block_id: input.block_id,
    p_exercise_id: input.exercise_id,
    p_sets: input.sets,
    p_reps: input.reps,
    p_rest_seconds: input.rest_seconds,
    p_peso_kg: input.peso_kg,
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
  input: {
    sets?: number | null;
    reps?: string | null;
    rest_seconds?: number | null;
    peso_kg?: number | null;
  }
): Promise<void> {
  const res = await supabase.from('routine_block_exercises').update(input).eq('id', id);
  if (res.error) throw res.error;
}
