/**
 * Traduce un error de Supabase a un mensaje que se pueda mostrar al usuario.
 *
 * Los errores de PostgREST traen `message`, `details`, `hint` y `code`, y esos
 * textos describen el schema: nombres de constraints, de columnas, y a veces un
 * fragmento de la consulta. Mostrarlos le dice a un atacante que existe la
 * tabla `staff_allowlist` con una columna `email`, aunque el error sea un 403.
 *
 * La regla es: el detalle va al log (para nosotros), al usuario le llega un
 * motivo de alto nivel. Los `hint` de auth si son seguros de mostrar, asi que
 * se dejan pasar: son los unicos que explican que hacer ("Password should be
 * at least 6 characters").
 */
export function friendlyError(e: unknown, fallback = 'Ocurrio un error inesperado.'): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const { message, hint, code } = e as { message?: string; hint?: string; code?: string };

    // Autenticacion: el hint es texto de producto, no schema. Se conserva.
    if (code === 'invalid_credentials') {
      return 'Email o contrasena incorrectos.';
    }
    if (code === 'email_not_confirmed') {
      return 'Confirmá tu email antes de entrar.';
    }
    if (code === 'user_already_exists') {
      return 'Ya existe una cuenta con ese email.';
    }
    if (code === 'weak_password' || code === 'password_too_short') {
      return hint?.trim() || 'La contrasena es muy debil.';
    }
    if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') {
      return 'Demasiados intentos. Espera unos segundos y proba de nuevo.';
    }

    // Errores de app propios (los RPCs de routines y schedule). Estos si son
    // texto pensado para el usuario, written por nosotros.
    if (typeof message === 'string' && /^(Solo un profe|Este ejercicio|Este grupo muscular)/.test(message)) {
      return message;
    }

    // Cualquier otro Postgres/PostgREST: no se muestra nada del error real.
    console.warn('[error] detalle de Supabase no mostrado al usuario', e);
    return fallback;
  }

  return fallback;
}
