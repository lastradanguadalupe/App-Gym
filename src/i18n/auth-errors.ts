import type { AuthErrorCode } from '@/lib/auth-account';

import type { TranslationKey } from './es';

/**
 * Cada código de `AuthErrorCode` tiene su propio texto: son ramas que el usuario
 * necesita distinguir (ese email ya está usado vs. sesión vencida). Un `Record`
 * con TODAS las claves hace que agregar un código nuevo rompa el typecheck en
 * vez de caer en un mensaje genérico.
 *
 * Vive acá y no en la pantalla porque lo usan dos: email y contraseña.
 */
export const AUTH_ERROR_KEY: Record<AuthErrorCode, TranslationKey> = {
  email_in_use: 'ajustes.emailEnUso',
  email_invalido: 'ajustes.emailInvalido',
  weak_password: 'ajustes.contrasenaMuyCorta',
  same_password: 'ajustes.contrasenaIgual',
  current_password_mismatch: 'ajustes.contrasenaActualIncorrecta',
  reauth_required: 'ajustes.reautenticacionNecesaria',
  rate_limited: 'ajustes.muchosIntentos',
  sesion_rota: 'ajustes.sesionVencida',
  unknown: 'ajustes.errorDesconocido',
};