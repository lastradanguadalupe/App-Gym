import { supabase } from '@/lib/supabase';
import type { Exercise, MuscleGroup } from '@/types';

import { dataOrThrow } from './shared';

export type ExerciseWithGroup = Exercise & { muscle_groups: MuscleGroup };

export async function fetchMuscleGroups(): Promise<MuscleGroup[]> {
  const res = await supabase.from('muscle_groups').select('*').order('id');
  return dataOrThrow<MuscleGroup[]>(res);
}

export async function fetchExercises(): Promise<ExerciseWithGroup[]> {
  const res = await supabase
    .from('exercises')
    .select('*, muscle_groups(*)')
    .order('name');
  return dataOrThrow<ExerciseWithGroup[]>(res);
}

export async function fetchExercise(id: number): Promise<ExerciseWithGroup> {
  const res = await supabase
    .from('exercises')
    .select('*, muscle_groups(*)')
    .eq('id', id)
    .single();
  return dataOrThrow<ExerciseWithGroup>(res);
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

export async function updateExercise(
  id: number,
  input: { name?: string; instructions?: string | null; image_url?: string | null }
): Promise<void> {
  const res = await supabase.from('exercises').update(input).eq('id', id);
  if (res.error) throw res.error;
}

export async function deleteExercise(id: number): Promise<void> {
  const res = await supabase.from('exercises').delete().eq('id', id);
  if (res.error) throw res.error;
}
