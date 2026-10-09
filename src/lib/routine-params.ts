import { tIn } from '@/i18n';
import type { Idioma, RoutineBlockExercise } from '@/types';

/**
 * Parámetros de un ejercicio dentro de un bloque: series, repeticiones,
 * descanso y peso.
 *
 * Nada tiene valor por defecto: `null` = "sin definir" y se muestra como "—"
 * (nunca como un número inventado). Las funciones de este módulo son puras y
 * reciben `locale` para que se puedan testear sin tocar el estado global de
 * i18n, igual que `lib/format.ts`.
 */

/* Constantes de los selectores ------------------------------------------ */

export const SERIES_MIN = 1;
export const SERIES_MAX = 10;

export const REST_MIN = 15;
export const REST_MAX = 300;
export const REST_STEP = 15;

/** Pasos del selector de peso. `2.5` es el paso por defecto. */
export const WEIGHT_STEPS = [2.5, 1, 0.5] as const;
export const WEIGHT_STEP_DEFAULT: number = 2.5;
export const WEIGHT_MAX = 200;

export const REPS_MIN = 1;
export const REPS_MAX = 100;

/** Rangos que tolera el CHECK de la base para `reps`. */
export const REPS_TEXT_MAX = 20;

/* Repeticiones ---------------------------------------------------------- */

export type RepsMode = 'fijo' | 'rango' | 'fallo';

export type RepsDraft = {
  mode: RepsMode;
  fijo: number | null;
  min: number | null;
  max: number | null;
};

/** Arranca sin definir: el profe tiene que elegir un valor. */
export const EMPTY_REPS: RepsDraft = { mode: 'fijo', fijo: null, min: null, max: null };

/** `reps` guardada en la base → borrador del formulario. */
export function parseReps(text: string | null | undefined): RepsDraft {
  const value = (text ?? '').trim();
  if (!value) return EMPTY_REPS;
  if (value.toLowerCase() === 'al fallo') return { ...EMPTY_REPS, mode: 'fallo' };

  const range = /^(\d{1,3})\s*-\s*(\d{1,3})$/.exec(value);
  if (range) {
    return { mode: 'rango', fijo: null, min: Number(range[1]), max: Number(range[2]) };
  }

  const single = /^\d{1,3}$/.exec(value);
  if (single) return { mode: 'fijo', fijo: Number(value), min: null, max: null };

  // Texto libre viejo (si lo hubiera): se muestra tal cual, sin modo.
  return EMPTY_REPS;
}

/** Borrador → texto para la base. `null` = sin definir. */
export function serializeReps(draft: RepsDraft): string | null {
  if (draft.mode === 'fallo') return 'al fallo';
  if (draft.mode === 'fijo') return draft.fijo == null ? null : String(draft.fijo);
  if (draft.min == null || draft.max == null) return null;
  return `${draft.min}-${draft.max}`;
}

/**
 * ¿Se puede guardar? Series y repeticiones son obligatorios; descanso y peso
 * no.
 */
export function repsAreValid(draft: RepsDraft): boolean {
  if (draft.mode === 'fallo') return true;
  if (draft.mode === 'fijo') return draft.fijo != null;
  if (draft.min == null || draft.max == null) return false;
  return draft.min <= draft.max;
}

/* Formateo -------------------------------------------------------------- */

/**
 * Separador decimal según idioma: en español 2,5; en inglés 2.5.
 * Los valores enteros se escriben sin decimales.
 */
export function formatNumber(locale: Idioma, value: number): string {
  const fixed = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, '');
  return locale === 'es' ? fixed.replace('.', ',') : fixed;
}

/** `reps` guardada → texto para mostrar. `null` = sin definir. */
export function repsDisplay(text: string | null | undefined, locale: Idioma): string | null {
  const value = (text ?? '').trim();
  if (!value) return null;
  if (value.toLowerCase() === 'al fallo') return tIn(locale, 'common.alFallo');
  return value;
}

/** 60 → "60 s", 90 → "1 min 30 s", 300 → "5 min". */
export function formatRest(locale: Idioma, seconds: number | null | undefined): string | null {
  if (seconds == null) return null;
  if (seconds < 60) return `${seconds} s`;
  const min = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${min} min` : `${min} min ${rest} s`;
}

/**
 * 20 → "20 kg"; 0 → "Peso corporal" (peso corporal / sin peso);
 * `null` → sin definir.
 */
export function formatWeight(locale: Idioma, kg: number | null | undefined): string | null {
  if (kg == null) return null;
  if (kg === 0) return tIn(locale, 'common.pesoCorporal');
  return `${formatNumber(locale, kg)} ${tIn(locale, 'perfil.kg')}`;
}

/* Selector de peso ------------------------------------------------------ */

/** Valores del selector de peso para un paso dado, de 0 a 200. */
export function weightOptions(step: number): number[] {
  const values: number[] = [];
  // Suma en "décimas" para que 0.5 + 0.5 no arrastre error de flotantes.
  const tenths = Math.round(step * 10);
  for (let t = 0; t <= WEIGHT_MAX * 10; t += tenths) values.push(t / 10);
  return values;
}

export function restOptions(): number[] {
  const values: number[] = [];
  for (let s = REST_MIN; s <= REST_MAX; s += REST_STEP) values.push(s);
  return values;
}

export function seriesOptions(): number[] {
  return Array.from({ length: SERIES_MAX - SERIES_MIN + 1 }, (_, i) => SERIES_MIN + i);
}

/* Presentación ---------------------------------------------------------- */

export type ParamSegment = {
  label: string;
  value: string;
  /** `false` = el valor no está definido y hay que pintarlo apagado. */
  defined: boolean;
};

/**
 * Los cuatro parámetros como pares etiqueta/valor, para que el panel los muestre
 * con rótulos claros: "Series: 3 · Repeticiones: 10-12 · Descanso: 60 s · Peso: 20 kg".
 */
export function paramSegments(
  locale: Idioma,
  rbe: Pick<RoutineBlockExercise, 'sets' | 'reps' | 'rest_seconds' | 'peso_kg'>
): ParamSegment[] {
  const reps = repsDisplay(rbe.reps, locale);
  const rest = formatRest(locale, rbe.rest_seconds);
  const weight = formatWeight(locale, rbe.peso_kg);

  return [
    {
      label: tIn(locale, 'common.series'),
      value: rbe.sets == null ? '—' : String(rbe.sets),
      defined: rbe.sets != null,
    },
    {
      label: tIn(locale, 'common.repeticiones'),
      value: reps ?? '—',
      defined: reps != null,
    },
    {
      label: tIn(locale, 'common.descanso'),
      value: rest ?? '—',
      defined: rest != null,
    },
    {
      label: tIn(locale, 'common.peso'),
      value: weight ?? '—',
      defined: weight != null,
    },
  ];
}

/**
 * Resumen compacto para la app del alumno: "3 × 10-12 · 60 s · 20 kg".
 * Los parámetros sin definir se omiten; si no hay ninguno, "—".
 */
export function compactSummary(
  locale: Idioma,
  rbe: Pick<RoutineBlockExercise, 'sets' | 'reps' | 'rest_seconds' | 'peso_kg'>
): string {
  const parts: string[] = [];
  const reps = repsDisplay(rbe.reps, locale);

  if (rbe.sets != null && reps != null) parts.push(`${rbe.sets} × ${reps}`);
  else if (rbe.sets != null) parts.push(tIn(locale, 'format.soloSeries', { series: rbe.sets }));
  else if (reps != null) parts.push(reps);

  const rest = formatRest(locale, rbe.rest_seconds);
  if (rest) parts.push(rest);

  const weight = formatWeight(locale, rbe.peso_kg);
  if (weight) parts.push(weight);

  return parts.length ? parts.join(' · ') : tIn(locale, 'common.sinDato');
}
