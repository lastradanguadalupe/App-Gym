/**
 * Medidas y decisiones de layout del panel del profe.
 *
 * Viven en `lib` (y no en el componente) para poder testear las anchuras sin
 * renderizar `AdminShell`, que arrastra el `Stack` de expo-router y el contexto
 * de sesión. El componente solo consume estos valores.
 */

/** A partir de esta anchura el sidebar queda fijo; por debajo, es un drawer. */
export const WIDE_BREAKPOINT = 900;
/** Ancho del sidebar desplegado. */
export const SIDEBAR_WIDTH = 264;
/** Ancho del sidebar colapsado a una barra de íconos. */
export const SIDEBAR_COLLAPSED_WIDTH = 76;
/** Ancho del drawer superpuesto en pantallas angostas. */
export const DRAWER_WIDTH = 280;

export type SidebarMode = 'fixed' | 'drawer';

/**
 * Cómo se presenta la navegación lateral según la anchura:
 *  - `fixed`: sidebar siempre visible (se puede colapsar a íconos).
 *  - `drawer`: sidebar oculto, se abre superpuesto con la hamburguesa.
 */
export function sidebarMode(width: number): SidebarMode {
  return width >= WIDE_BREAKPOINT ? 'fixed' : 'drawer';
}
