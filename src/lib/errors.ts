import { t, type TranslationKey } from '@/i18n';

/**
 * Traduce un error de Supabase a un mensaje que se pueda mostrar al usuario.
 *
 * Los errores de PostgREST traen `message`, `details`, `hint` y `code`, y esos
 * textos describen el schema: nombres de constraints, de columnas, y a veces un
 * fragmento de la consulta. Mostrarlos le dice a un atacante que existe la
 * tabla `staff_allowlist` con una columna `email`, aunque el error sea un 403.
 *
 * La regla es: el detalle va al log (para nosotros), al usuario le llega un
 * motivo de alto nivel.
 *
 * Devuelve una clave ya resuelta en el idioma activo: el texto de los RPCs
 * llega escrito en español desde Postgres, así que se traduce por_lookup en vez
 * de pasarlo crudo (ver `RPC_MESSAGE_KEY`).
 */
export function friendlyError(e: unknown, fallback: TranslationKey): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const { message, hint, code } = e as { message?: string; hint?: string; code?: string };

    // Autenticacion: el hint es texto de producto, no schema. Se conserva.
    if (code === 'invalid_credentials') {
      return t('common.credencialesIncorrectas');
    }
    if (code === 'email_not_confirmed') {
      return t('common.emailNoConfirmado');
    }
    if (code === 'user_already_exists') {
      return t('common.emailYaRegistrado');
    }
    if (code === 'weak_password' || code === 'password_too_short') {
      return hint?.trim() || t('common.contrasenaDebil');
    }
    if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') {
      return t('common.demasiadosIntentos');
    }

    // Errores de app propios: los `raise exception` de los RPCs de rutinas,
    // búsqueda de alumnos, estadísticas y borrados de catálogo. Son mensajes
    // pensados para el usuario, no schema, pero llegan en español fijo.
    if (typeof message === 'string') {
      const key = RPC_MESSAGE_KEY[message.trim()];
      if (key) return t(key);
    }

    // Cualquier otro Postgres/PostgREST: no se muestra nada del error real.
    console.warn('[error] detalle de Supabase no mostrado al usuario', e);
    return t(fallback);
  }

  return t(fallback);
}

/**
 * Los mensajes que escribimos nosotros en Postgres, con su traducción.
 *
 * Es un `Record` con TODAS las claves: si un RPC nuevo agrega un `raise
 * exception` y nadie lo agrega acá, el error cae al `fallback` genérico en vez
 * de mostrarse en español a un usuario inglés. Para sumar uno: escribí el
 * `raise exception` en las migraciones y el par es/en acá, en el mismo commit.
 */
const RPC_MESSAGE_KEY: Record<string, TranslationKey> = {
  'Solo un profe puede buscar alumnos': 'common.soloProfeBuscaAlumnos',
  'Solo un profe puede asignarse alumnos': 'common.soloProfeAsignaAlumnos',
  'Ese alumno ya está asignado a otro profe': 'common.alumnoYaTieneProfe',
  'Solo un profe puede ver la lista de staff': 'common.soloProfeListaStaff',
  'Solo un profe puede habilitar accesos de staff': 'common.soloProfeHabilitaStaff',
  'Solo un profe puede quitar accesos de staff': 'common.soloProfeQuitaStaff',
  'Solo un profe puede ver estadísticas de alumnos': 'common.soloProfeVeEstadisticas',
  'Solo un profe puede crear rutinas': 'common.soloProfeCreaRutinas',
  'Solo un profe puede crear bloques': 'common.soloProfeCreaBloques',
  'Solo un profe puede agregar ejercicios': 'common.soloProfeAgregaEjercicios',
  'Este grupo muscular tiene ejercicios asociados. Borralos o reasignalos primero.':
    'common.grupoMuscularConEjercicios',
  'Este ejercicio esta en uso por al menos una rutina. Quitalo de las rutinas primero.':
    'common.ejercicioEnUso',
  'No se pueden guardar datos de salud sin consentimiento vigente':
    'common.consentimientoSaludRequerido',
};
