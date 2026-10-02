import { supabase } from '@/lib/supabase';
import type { MotivationalPhrase, NutritionTip } from '@/types';

import { dataOrThrow, pick } from './shared';

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
