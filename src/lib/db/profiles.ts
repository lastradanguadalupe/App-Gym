import { supabase } from '@/lib/supabase';
import type { ClientDetails, Idioma, Profile } from '@/types';

import { dataOrThrow } from './shared';

export type AlumnoStats = { sessions: number; minutes: number; hasRoutine: boolean };

export type ClientDetailsInput = Partial<Omit<ClientDetails, 'id' | 'created_at' | 'updated_at'>>;

// ---------- Perfil ----------

export async function fetchProfile(uid: string): Promise<Profile> {
  const res = await supabase.from('profiles').select('*').eq('id', uid).single();
  return dataOrThrow<Profile>(res);
}

export async function updateProfileName(uid: string, name: string): Promise<void> {
  const res = await supabase.from('profiles').update({ name }).eq('id', uid);
  if (res.error) throw res.error;
}

/**
 * Campos de cuenta editables desde Ajustes.
 *
 * La tabla tiene privilege de columna: solo `name`, `avatar_url`, `username` e
 * `idioma` son escribibles desde el cliente (ver la migración de seguridad).
 * `role`, `profe_id` y `email` quedan fuera a propósito.
 */
export type ProfilePrefsInput = {
  name?: string;
  username?: string | null;
  idioma?: Idioma;
};

/** Guarda varios campos de cuenta en un solo UPDATE. */
export async function updateProfilePrefs(uid: string, input: ProfilePrefsInput): Promise<void> {
  const res = await supabase.from('profiles').update(input).eq('id', uid);
  if (res.error) throw res.error;
}

/**
 * Alias de `updateProfilePrefs` para un cambio de idioma puntual.
 * El provider de i18n lo usa para persistir la preferencia.
 */
export async function updateProfileLanguage(uid: string, idioma: Idioma): Promise<void> {
  await updateProfilePrefs(uid, { idioma });
}

/**
 * Comprueba si un alias está libre. No alcanza con el error de unique: el
 * mensaje de Postgres no distingue "tomado" de otros fallos y el usuario
 * necesita una respuesta clara antes de confirmar.
 */
export async function isUsernameTaken(username: string, uid: string): Promise<boolean> {
  const res = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .neq('id', uid)
    .limit(1);
  if (res.error) throw res.error;
  return (res.data ?? []).length > 0;
}

// ---------- Cuestionario de cliente ----------

export async function fetchClientDetails(uid: string): Promise<ClientDetails | null> {
  const res = await supabase.from('client_details').select('*').eq('user_id', uid).maybeSingle();
  if (res.error) throw res.error;
  return (res.data as ClientDetails | null) ?? null;
}

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

// ---------- Alumnos del profe ----------

/** Alumnos asignados al profe (nunca el directorio global). Paginado. */
export async function fetchAlumnos(
  profeId: string,
  page: number,
  pageSize: number
): Promise<Profile[]> {
  const from = page * pageSize;
  const res = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'cliente')
    .eq('profe_id', profeId)
    .order('name')
    .range(from, from + pageSize - 1);
  return dataOrThrow<Profile[]>(res);
}

/** Total de alumnos del profe, para saber cuantas paginas hay. */
export async function countAlumnos(profeId: string): Promise<number> {
  const res = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'cliente')
    .eq('profe_id', profeId);
  if (res.error) throw res.error;
  return res.count ?? 0;
}

/**
 * Agregados de todos los alumnos de un profe en una sola consulta.
 *
 * Reemplaza el patron N+1 del panel, que por alumno pedia sus sesiones
 * completas y su rutina activa solo para contar y sumar.
 */
export async function fetchStudentStats(profeId: string): Promise<Record<string, AlumnoStats>> {
  const res = await supabase.rpc('student_stats', { p_profe_id: profeId });
  if (res.error) throw res.error;
  const rows = (res.data ?? []) as {
    client_id: string;
    session_count: number;
    total_minutes: number;
    has_routine: boolean;
  }[];
  return Object.fromEntries(
    rows.map((r) => [
      r.client_id,
      {
        sessions: Number(r.session_count),
        minutes: Number(r.total_minutes),
        hasRoutine: r.has_routine,
      },
    ])
  );
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
