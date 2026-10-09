/**
 * Politica de contrasenas del lado del cliente.
 *
 * El limite real lo aplica Supabase Auth (ver `minimum_password_length` y
 * `password_requirements` en supabase/config.toml, y el panel de Auth en
 * produccion). Esto existe para dar un mensaje util antes de gastar un request,
 * no para reemplazar la validacion del servidor: cualquiera puede saltear el
 * cliente.
 *
 * Devuelve una clave de traduccion, no el texto: el mensaje se resuelve en
 * render con `t()`, asi que el mismo chequeo sirve para los dos idiomas.
 */

import type { TranslationKey } from '@/i18n/es';

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordCheck = { ok: true } | { ok: false; key: TranslationKey };

export function validatePassword(password: string): PasswordCheck {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, key: 'ajustes.contrasenaMuyCorta' };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { ok: false, key: 'ajustes.contrasenaDebil' };
  }
  return { ok: true };
}
