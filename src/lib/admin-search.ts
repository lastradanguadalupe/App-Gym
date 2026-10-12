/**
 * Lógica pura del buscador de alumnos del panel del profe.
 *
 * Se separa de `panel.tsx` para poder testearla sin renderizar: decide qué
 * mensaje corresponde según la consulta, cuántos resultados hubo y —solo en
 * el caso de un email exacto— el estado que devolvió el servidor.
 */

/** Mínimo de caracteres para disparar una búsqueda (coincide con el server). */
export const MIN_SEARCH_CHARS = 2;

/** ¿La consulta parece un email? Solo ahí se distingue "ya tiene profe". */
export function isEmailQuery(query: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query.trim());
}

/** Lo que devuelve `search_clients_status` para un email exacto. */
export type ClientSearchStatus = 'mine' | 'other' | 'none';

/**
 * Situación a mostrar para una búsqueda:
 * - `minimum`: menos de 2 caracteres, no se busca.
 * - `results`: hay coincidencias.
 * - `otherProfe`: sin resultados, email exacto que pertenece a otro profe.
 * - `emptyEmail`: sin resultados, la consulta era un email.
 * - `emptyName`: sin resultados, la consulta era un nombre.
 */
export type SearchOutcome =
  | 'minimum'
  | 'results'
  | 'otherProfe'
  | 'emptyEmail'
  | 'emptyName';

export function searchOutcome(
  query: string,
  count: number,
  status: ClientSearchStatus | null
): SearchOutcome {
  if (query.trim().length < MIN_SEARCH_CHARS) return 'minimum';
  if (count > 0) return 'results';
  if (isEmailQuery(query)) {
    return status === 'other' ? 'otherProfe' : 'emptyEmail';
  }
  return 'emptyName';
}
