/**
 * Helpers de acceso a datos compartidos por los modulos de dominio.
 * No se re-exportan desde `index.ts`: son detalle de implementacion.
 */

/** Supabase devuelve `{ data: null }` sin error cuando no hay filas; eso no es un fallo. */
export function dataOrThrow<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error || data == null) {
    throw error ? (error as Error) : new Error('Sin datos');
  }
  return data;
}

/** Elige un elemento al azar, o null si la lista esta vacia. */
export function pick<T>(list: T[]): T | null {
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}
