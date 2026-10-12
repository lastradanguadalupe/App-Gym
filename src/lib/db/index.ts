/**
 * Barril de acceso a datos. La app importa siempre desde `@/lib/db`.
 *
 * `shared.ts` no se re-exporta a proposito: son helpers internos de los
 * modulos de dominio.
 */

export * from './catalog';
export * from './consents';
export * from './content';
export * from './dashboard';
export * from './measurements';
export * from './profiles';
export * from './routines';
export * from './schedule';
export * from './sessions';
