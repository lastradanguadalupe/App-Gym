import { supabase } from '@/lib/supabase';

/**
 * Acceso al dashboard del profe. Todo llega en una sola RPC (`profe_dashboard`)
 * para no encadenar consultas al abrir el panel: el "seguir donde quedamos", los
 * alumnos a los que atender, la actividad reciente y los números de la semana.
 */

/** Días sin entrenar a partir de los cuales un alumno pide atención. */
export const INACTIVE_DAYS = 7;
/** Días sin tocar la rutina a partir de los cuales conviene revisarla. */
export const STALE_ROUTINE_DAYS = 30;

/** Última rutina editada por el profe: el atajo "Seguir donde quedamos". */
export type ContinueRoutine = {
  routine_id: number;
  title: string;
  client_id: string;
  client_name: string;
  /** Primer bloque de la rutina: destino ideal del constructor. */
  block_id: number | null;
  block_name: string | null;
  block_count: number;
  updated_at: string;
};

/** Por qué un alumno entra en "necesitan atención". */
export type AttentionReason = 'no_routine' | 'inactive' | 'stale';

export type AttentionStudent = {
  client_id: string;
  name: string;
  reason: AttentionReason;
  /** Días sin entrenar (inactive) o desde la última edición (stale). */
  days: number;
};

export type RecentActivity = {
  client_id: string;
  client_name: string;
  block_name: string | null;
  duration_minutes: number | null;
  completed_on: string;
};

export type WeekSummary = {
  /** Entrenamientos completados esta semana. */
  completed: number;
  /** Alumnos distintos que entrenaron esta semana. */
  active: number;
  /** Total de alumnos del profe. */
  total: number;
  /** Cuántos de esos alumnos todavía no tienen rutina activa. */
  without_routine: number;
};

export type ProfeDashboard = {
  /** `null` cuando el profe todavía no armó ninguna rutina. */
  continue: ContinueRoutine | null;
  /** Alumno sin rutina, para el arranque en frío. `null` si ya no queda ninguno. */
  first_student: { client_id: string; name: string } | null;
  /** Hasta 5 alumnos que necesitan atención. */
  attention: AttentionStudent[];
  /** Total de alumnos que necesitan atención (puede superar el largo del array). */
  attention_total: number;
  activity: RecentActivity[];
  week: WeekSummary;
};

export type DashboardRange = {
  /** Inicio de semana (lunes 00:00 local), en ISO. */
  weekStart: string;
  /** Inicio de la semana siguiente (lunes 00:00 local), en ISO. */
  weekEnd: string;
};

export async function fetchProfeDashboard(range: DashboardRange): Promise<ProfeDashboard> {
  const res = await supabase.rpc('profe_dashboard', {
    p_week_start: range.weekStart,
    p_week_end: range.weekEnd,
    p_inactive_days: INACTIVE_DAYS,
    p_stale_days: STALE_ROUTINE_DAYS,
  });
  if (res.error) throw res.error;
  return res.data as ProfeDashboard;
}
