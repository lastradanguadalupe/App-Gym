import { supabase } from '@/lib/supabase';
import { HEALTH_CONSENT_VERSION, PRIVACY_POLICY_VERSION } from '@/lib/legal';
import type { Consent, ConsentType } from '@/types';

/**
 * Consentimientos del usuario.
 *
 * `consents` es un historial de solo agregar (ver la migración
 * 20261011000000_health_consents.sql): no hay update ni delete desde el cliente.
 * El estado vigente es la última fila por (`user_id`, `type`).
 */

/** Última fila de `consents` para ese tipo, o `null` si nunca se aceptó/retiró. */
export async function fetchLatestConsent(
  uid: string,
  type: ConsentType
): Promise<Consent | null> {
  const res = await supabase
    .from('consents')
    .select('*')
    .eq('user_id', uid)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (res.error) throw res.error;
  return (res.data as Consent | null) ?? null;
}

/** Inserta una fila nueva de consentimiento. Nunca actualiza: agrega al historial. */
export async function recordConsent(
  uid: string,
  type: ConsentType,
  granted: boolean
): Promise<void> {
  const policyVersion =
    type === 'health_data' ? HEALTH_CONSENT_VERSION : PRIVACY_POLICY_VERSION;
  const res = await supabase
    .from('consents')
    .insert({ user_id: uid, type, policy_version: policyVersion, granted });
  if (res.error) throw res.error;
}

/**
 * Retira el consentimiento de salud y vacía enfermedades y lesiones.
 *
 * Va por RPC para que el registro del retiro y el borrado de los datos sean una
 * sola transacción: si se hiciera en dos llamadas y fallara la segunda, quedaría
 * un consentimiento retirado con datos de salud todavía guardados (estado que el
 * trigger de la base ya no permitiría corregir con un update normal).
 */
export async function withdrawHealthConsent(): Promise<void> {
  const res = await supabase.rpc('withdraw_health_consent', {
    p_policy_version: HEALTH_CONSENT_VERSION,
  });
  if (res.error) throw res.error;
}
