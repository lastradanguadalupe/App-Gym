import { supabase } from '@/lib/supabase';
import type { RoutineBlock, WorkoutSession } from '@/types';

import { dataOrThrow } from './shared';

export type SessionWithBlock = WorkoutSession & { routine_blocks: RoutineBlock | null };

export async function fetchSessions(clientId: string): Promise<SessionWithBlock[]> {
  const res = await supabase
    .from('workout_sessions')
    .select('*, routine_blocks(id, name, region)')
    .eq('client_id', clientId)
    .order('completed_on', { ascending: false });
  return (res.data as SessionWithBlock[]) ?? [];
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

/**
 * Solo las fechas con entrenamiento, para pintar la grilla del calendario.
 *
 * `fetchSessions` trae la sesión entera (bloque, duración, notas) y el
 * calendario solo necesita saber qué días se entrenó: pedir una sola columna
 * evita bajar cientos de filas con datos que después se descartan.
 */
export async function fetchSessionDays(clientId: string): Promise<string[]> {
  const res = await supabase
    .from('workout_sessions')
    .select('completed_on')
    .eq('client_id', clientId);
  if (res.error) throw res.error;
  return (res.data ?? []).map((row) => row.completed_on);
}
