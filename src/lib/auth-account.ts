import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { validatePassword } from '@/lib/validation';

/**
 * Cambio de email y de contraseña sobre la cuenta de auth.
 *
 * No usa `friendlyError()` a propósito: acá los errores NO son casos raros sino
 * ramas de UI que el usuario tiene que distinguir ("ese email ya está usado",
 * "la contraseña actual no es correcta", "tu sesión está vieja"). El mapper
 * devuelve un código cerrado y lo traduce la pantalla con `t()`.
 *
 * Sobre lo que hace Supabase (verificado en el fuente Go, internal/api/user.go):
 *
 *  * Email: `updateUser({ email })` NO cambia el email en el acto; manda un
 *    correo de confirmación a la dirección NUEVA y recién al confirmarlo cambia.
 *    `email_exists` es el error cuando la casilla ya está en uso.
 *  * Contraseña: `current_password` solo se valida si el proyecto tiene activada
 *    la opción "Require current password when changing password" en el panel de
 *    Auth. Sin esa opción, mandar el campo es inocuo: la contraseña se cambia
 *    sin verificar nada. Ver README/report de la entrega.
 *  * Cuentas OAuth: SÍ se les puede poner contraseña. `addingFirstPassword`
 *    dispara `ensureEmailIdentityForPassword`, que crea la identidad email.
 *    O sea que un usuario de Google puede setear una y después entrar con email.
 *    En ese caso no hay contraseña actual que verificar, y el backend lo sabe
 *    (`user.HasPassword()`) así que no pide `current_password`.
 */

export type AuthErrorCode =
  | 'email_in_use'
  | 'email_invalido'
  | 'weak_password'
  | 'same_password'
  | 'current_password_mismatch'
  | 'reauth_required'
  | 'rate_limited'
  | 'sesion_rota'
  | 'unknown';

export type AuthResult = { ok: true } | { ok: false; code: AuthErrorCode };

function classify(error: { code?: string; hint?: string } | null): AuthErrorCode {
  switch (error?.code) {
    case 'email_exists':
    case 'user_already_exists':
      return 'email_in_use';
    case 'weak_password':
    case 'password_too_short':
      return 'weak_password';
    case 'same_password':
      return 'same_password';
    case 'current_password_mismatch':
      return 'current_password_mismatch';
    case 'reauthentication_needed':
      return 'reauth_required';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'rate_limited';
    case 'no_session':
    case 'session_not_found':
      return 'sesion_rota';
    default:
      return 'unknown';
  }
}

/** Con qué proveedor entró el usuario y si tiene contraseña configurada.
 * `identities` es la fuente de verdad: una cuenta creada con Google tiene
 * `[{ provider: 'google' }]`; apenas se le pone contraseña se agrega una
 * identidad `email` al lado.
 */
export type AccountInfo = {
  email: string;
  /** Tiene identidad email/password: puede cambiar su contraseña. */
  hasPassword: boolean;
  /** Entra con Google. */
  usedGoogle: boolean;
};

export function accountInfo(user: User): AccountInfo {
  const providers = (user.identities ?? []).map((i) => i.provider);
  return {
    email: user.email ?? '',
    hasPassword: providers.includes('email'),
    usedGoogle: providers.includes('google'),
  };
}

/**
 * Pide el cambio de email. Supabase manda la confirmación a la dirección nueva:
 * hasta que el usuario la abra, la cuenta sigue con el email anterior.
 */
export async function requestEmailChange(nextEmail: string): Promise<AuthResult> {
  const clean = nextEmail.trim();
  const { error } = await supabase.auth.updateUser({ email: clean });

  if (!error) return { ok: true };
  if (error.code === 'validation_failed') return { ok: false, code: 'email_invalido' };

  const code = classify(error);
  // No mostrar el detalle crudo del backend: puede incluir schema.
  console.warn('[auth] fallo al cambiar email', error);
  return { ok: false, code };
}

/**
 * Cambia la contraseña.
 *
 * `currentPassword` se manda solo si la cuenta ya tiene contraseña: en una
 * cuenta OAuth recién creada mandarlo no aporta y Confusearía al usuario con un
 * campo que nunca se va a usar.
 */
export async function changePassword(input: {
  newPassword: string;
  currentPassword?: string;
  hasPassword: boolean;
}): Promise<AuthResult> {
  const check = validatePassword(input.newPassword);
  if (!check.ok) return { ok: false, code: 'weak_password' };

  const payload: { password: string; current_password?: string } = {
    password: input.newPassword,
  };
  if (input.hasPassword && input.currentPassword) {
    payload.current_password = input.currentPassword;
  }

  const { error } = await supabase.auth.updateUser(payload);

  if (!error) return { ok: true };
  const code = classify(error);
  console.warn('[auth] fallo al cambiar contraseña', error);
  return { ok: false, code };
}