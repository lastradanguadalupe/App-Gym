import type { ClientDetails, Consent } from '@/types';

/**
 * Versiones de los textos legales.
 *
 * `policy_version` es una constante en el código, no un dato de la base: se
 * guarda en cada fila de `consents` para poder reconstruir QUÉ texto aceptó el
 * usuario. Cuando cambia el texto de la Política de Privacidad o del
 * consentimiento de salud, se sube la versión correspondiente acá y la app
 * vuelve a pedir la aceptación.
 *
 * Formato: `AAAA-MM-vN`.
 */
export const PRIVACY_POLICY_VERSION = '2026-10-v1';
export const HEALTH_CONSENT_VERSION = '2026-10-v1';

/** ¿El cuestionario tiene datos de salud guardados (enfermedades o lesiones)? */
export function hasHealthData(
  details: Pick<ClientDetails, 'enfermedades' | 'lesiones'> | null | undefined
): boolean {
  if (!details) return false;
  return details.enfermedades.length > 0 || details.lesiones.length > 0;
}

/** ¿El consentimiento de salud está vigente? */
export function hasActiveHealthConsent(consent: Consent | null | undefined): boolean {
  return consent?.type === 'health_data' && consent.granted === true;
}
