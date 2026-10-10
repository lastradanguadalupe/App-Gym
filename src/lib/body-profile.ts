import type { WheelOption } from '@/lib/wheel';
import { tIn } from '@/i18n';
import { isIsoDate, toIsoDate, type Mes } from '@/lib/calendar';
import { formatNumber } from '@/lib/routine-params';
import { SEXOS, type Idioma, type Sexo } from '@/types';

/**
 * Datos corporales del cuestionario: peso, altura, sexo y fecha de nacimiento.
 *
 * Acá viven los rangos, las opciones de las ruedas y los límites de la fecha.
 * Es puro y recibe `locale` para poder testearse sin el estado global de i18n,
 * igual que `lib/format.ts` y `lib/routine-params.ts`.
 *
 * El peso corporal NO comparte rango ni paso con el peso de los ejercicios
 * (`lib/routine-params.ts`, 2,5 kg): acá va de 30 a 250 kg en pasos de 0,5.
 */

/* Peso ---------------------------------------------------------------- */

export const PESO_MIN = 30;
export const PESO_MAX = 250;
export const PESO_STEP = 0.5;
/** Valor sugerido mostrado atenuado hasta que el usuario elige. */
export const PESO_SUGERIDO = 65;

/* Altura -------------------------------------------------------------- */

export const ALTURA_MIN = 120;
export const ALTURA_MAX = 220;
export const ALTURA_STEP = 1;
export const ALTURA_SUGERIDA = 165;

/* Fecha de nacimiento ------------------------------------------------- */

/** No se permiten fechas anteriores a esta cantidad de años. */
export const EDAD_MAXIMA_ANIOS = 100;
/** Al abrir el calendario arranca cerca de esta edad, no en el mes actual. */
export const EDAD_SUGERIDA_ANIOS = 25;

/** Etiqueta de peso, con la unidad y el separador decimal del idioma. */
export function pesoLabel(locale: Idioma, value: number): string {
  return `${formatNumber(locale, value)} ${tIn(locale, 'perfil.kg')}`;
}

/** Etiqueta de altura, con la unidad del idioma. */
export function alturaLabel(locale: Idioma, value: number): string {
  return `${formatNumber(locale, value)} ${tIn(locale, 'perfil.cm')}`;
}

/** Opciones de la rueda de peso: 30–250 kg en pasos de 0,5. */
export function pesoOptions(locale: Idioma): WheelOption<number>[] {
  const options: WheelOption<number>[] = [];
  // Se acumula en "décimas" para que 0,5 + 0,5 no arrastre error de flotantes.
  const stepTenths = Math.round(PESO_STEP * 10);
  for (let t = PESO_MIN * 10; t <= PESO_MAX * 10; t += stepTenths) {
    const value = t / 10;
    options.push({ value, label: pesoLabel(locale, value) });
  }
  return options;
}

/** Opciones de la rueda de altura: 120–220 cm en pasos de 1. */
export function alturaOptions(locale: Idioma): WheelOption<number>[] {
  const options: WheelOption<number>[] = [];
  for (let value = ALTURA_MIN; value <= ALTURA_MAX; value += ALTURA_STEP) {
    options.push({ value, label: alturaLabel(locale, value) });
  }
  return options;
}

/**
 * Mete `value` en la lista si no está: un peso guardado con el teclado viejo
 * (p. ej. 72,3) no cae en la grilla de 0,5 y, sin esto, la rueda mostraría la
 * sugerencia en lugar del dato real. Se inserta ordenado para números.
 */
export function withExactValue(
  options: WheelOption<number>[],
  value: number | null,
  label: (value: number) => string
): WheelOption<number>[] {
  if (value == null || options.some((option) => Object.is(option.value, value))) return options;
  const next = [...options, { value, label: label(value) }];
  next.sort((a, b) => (a.value as number) - (b.value as number));
  return next;
}

function sexoLabelKey(value: Sexo): 'ajustes.sexoFemenino' | 'ajustes.sexoMasculino' | 'ajustes.sexoNoDefinido' {
  switch (value) {
    case 'femenino':
      return 'ajustes.sexoFemenino';
    case 'masculino':
      return 'ajustes.sexoMasculino';
    default:
      return 'ajustes.sexoNoDefinido';
  }
}

/** Opciones de la rueda de sexo, con las etiquetas del idioma. */
export function sexoOptions(locale: Idioma): WheelOption<Sexo>[] {
  return SEXOS.map((value) => ({ value, label: tIn(locale, sexoLabelKey(value)) }));
}

/** Fecha más vieja y más nueva permitidas, como `YYYY-MM-DD` en hora local. */
export function birthDateBounds(today = new Date()): { minIso: string; maxIso: string } {
  const min = new Date(
    today.getFullYear() - EDAD_MAXIMA_ANIOS,
    today.getMonth(),
    today.getDate()
  );
  return { minIso: toIsoDate(min), maxIso: toIsoDate(today) };
}

/** `true` si la fecha existe y cae dentro de los últimos 100 años (sin futuro). */
export function isBirthDateAllowed(iso: string, today = new Date()): boolean {
  if (!isIsoDate(iso)) return false;
  const { minIso, maxIso } = birthDateBounds(today);
  return iso >= minIso && iso <= maxIso;
}

/** Mes en el que abre el calendario cuando todavía no hay fecha elegida. */
export function suggestedBirthMonth(today = new Date()): Mes {
  const date = new Date(
    today.getFullYear() - EDAD_SUGERIDA_ANIOS,
    today.getMonth(),
    today.getDate()
  );
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** Mes de una fecha `YYYY-MM-DD` (con parseo manual, sin corrimiento de UTC). */
export function monthOfIso(iso: string): Mes {
  const [year, month] = iso.split('-').map(Number);
  return { year, month: month - 1 };
}

/** ¿`mes` es anterior a `limite`? Compara año y después mes. */
export function earlierThanMonth(mes: Mes, limite: Mes): boolean {
  return mes.year < limite.year || (mes.year === limite.year && mes.month < limite.month);
}

/** Recorta `mes` para que quede dentro de [`min`, `max`]. */
export function clampMonth(mes: Mes, min: Mes, max: Mes): Mes {
  if (earlierThanMonth(mes, min)) return min;
  if (earlierThanMonth(max, mes)) return max;
  return mes;
}
