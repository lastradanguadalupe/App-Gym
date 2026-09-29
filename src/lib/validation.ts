/**
 * Politica de contrasenas del lado del cliente.
 *
 * El limite real lo aplica Supabase Auth (ver `minimum_password_length` y
 * `password_requirements` en supabase/config.toml, y el panel de Auth en
 * produccion). Esto existe para dar un mensaje util antes de gastar un request,
 * no para reemplazar la validacion del servidor: cualquiera puede saltear el
 * cliente.
 */

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordCheck = { ok: true } | { ok: false; message: string };

export function validatePassword(password: string): PasswordCheck {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      ok: false,
      message: 'La contraseña debe combinar letras y números.',
    };
  }
  return { ok: true };
}
