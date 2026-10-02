import { supabase } from '@/lib/supabase';
import type { RoutineSchedule } from '@/types';

import { dataOrThrow } from './shared';

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
