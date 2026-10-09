import { supabase } from '@/lib/supabase';
import type { MedidaCorporal } from '@/types';

import { dataOrThrow } from './shared';

/**
 * Historial de medidas corporales.
 *
 * A diferencia de `client_details`, que guarda la última línea de base, acá
 * cada medición es una fila con su fecha: eso es lo que alimenta el gráfico de
 * evolución. El trigger `medidas_sync_client_details` de la base espeja la
 * última medición en `client_details`, así que el cliente no tiene que hacerlo.
 */

export type MedidaInput = {
  fecha: string;
  peso_kg: number;
  altura_cm?: number | null;
};

/**
 * Todas las mediciones del socio, de la más vieja a la más nueva.
 *
 * El orden ascendente es el que espera el gráfico: el eje X es el tiempo, así
 * que invertir la lista invierte la línea.
 */
export async function fetchMedidas(usuarioId: string): Promise<MedidaCorporal[]> {
  const res = await supabase
    .from('medidas_corporales')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('fecha', { ascending: true })
    .order('id', { ascending: true });
  return dataOrThrow<MedidaCorporal[]>(res);
}

/**
 * Registra una medición.
 *
 * El upsert evita duplicar el punto del gráfico cuando el usuario repite el
 * mismo día: `medidas_corporales` tiene `unique (usuario_id, fecha)` y eso
 * actualiza la fila de ese día en lugar de sumar otra igual.
 */
export async function upsertMedida(
  usuarioId: string,
  input: MedidaInput
): Promise<MedidaCorporal> {
  const res = await supabase
    .from('medidas_corporales')
    .upsert(
      {
        usuario_id: usuarioId,
        fecha: input.fecha,
        peso_kg: input.peso_kg,
        // `altura_cm` es opcional en la tabla: si no se informa se deja NULL en
        // vez de mandar 0, que violaría el CHECK.
        altura_cm: input.altura_cm ?? null,
      },
      { onConflict: 'usuario_id,fecha' }
    )
    .select('*')
    .single();
  return dataOrThrow<MedidaCorporal>(res);
}

export async function deleteMedida(usuarioId: string, id: number): Promise<void> {
  const res = await supabase
    .from('medidas_corporales')
    .delete()
    .eq('id', id)
    .eq('usuario_id', usuarioId);
  if (res.error) throw res.error;
}