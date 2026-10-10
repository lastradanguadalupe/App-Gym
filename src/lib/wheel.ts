/**
 * Piezas puras del selector deslizable (wheel picker).
 *
 * Viven fuera del componente para poder testearse sin arrastrar el contexto de
 * sesión (que toca AsyncStorage y no existe en Jest). El componente reexporta.
 */
export type WheelOption<V = number> = { value: V | null; label: string };

/** Los botones − / + miden lo mismo que un ícono tocable cómodo. */
export const WHEEL_STEP_BUTTON = 36;
/** La rueda nunca baja de acá: si no, las etiquetas largas no entran. */
export const WHEEL_MIN_WIDTH = 120;
/**
 * Ancho mínimo de la fila completa: `[−] [rueda] [+]` con los gaps del layout.
 * A 320 px queda margen de sobra (ver __tests__/wheel-layout.test.ts).
 */
export const WHEEL_ROW_GAP = 8; // == Spacing.two
export const WHEEL_MIN_ROW_WIDTH = WHEEL_STEP_BUTTON * 2 + WHEEL_MIN_WIDTH + WHEEL_ROW_GAP * 2;

/**
 * Índice que la rueda tiene que resaltar. Es el valor elegido si está en la
 * lista; si no hay valor elegido, la sugerencia (rueda "sin elegir"); si no, el
 * primero.
 *
 * Ojo: la sugerencia se usa SOLO cuando `value` es `null`. Si hay un valor que
 * no está en la lista (p. ej. un peso viejo de 72,3 fuera de la grilla de 0,5),
 * no hay que mostrar la sugerencia: sería mostrar un dato falso.
 */
export function resolveWheelActiveIndex<V extends number | string>(
  options: WheelOption<V>[],
  value: V | null,
  suggestedValue?: V
): number {
  const selected = options.findIndex((option) => Object.is(option.value, value));
  if (selected >= 0) return selected;
  if (value == null && suggestedValue !== undefined) {
    const suggested = options.findIndex((option) => Object.is(option.value, suggestedValue));
    if (suggested >= 0) return suggested;
  }
  return 0;
}
