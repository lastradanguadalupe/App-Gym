import { I18n } from 'i18n-js';

import type { Idioma } from '@/types';

import { DEFAULT_LOCALE, type TranslationKey } from './es';
import en from './en';
import es from './es';

/**
 * Instancia única de i18n-js. La fuente de verdad del idioma es
 * `profiles.idioma` en la base (ver `I18nProvider`); esta instancia solo
 * guarda el idioma activo.
 *
 * `enableFallback` + `defaultLocale = 'es'` garantizan que una clave sin
 * traducir en inglés caiga al texto español en vez de mostrar el path.
 */
export const i18n = new I18n({ en, es });

i18n.defaultLocale = DEFAULT_LOCALE;
i18n.enableFallback = true;
i18n.locale = DEFAULT_LOCALE;

/** Variables de interpolación: `%{nombre}`. */
export type TranslateVars = Record<string, string | number>;

/**
 * `t('perfil.edadAnios', { edad: 30 })`.
 *
 * La clave está restringida a `TranslationKey`, que se deriva del diccionario
 * `es`: una clave mal escrita no compila.
 */
export function t(key: TranslationKey, vars?: TranslateVars): string {
  return i18n.t(key, vars) as string;
}

type Calendario = {
  months: readonly string[];
  monthsShort: readonly string[];
  weekdays: readonly string[];
  weekdaysShort: readonly string[];
};

/** Vocabulario de fechas del idioma pedido. Puro: no lee `i18n.locale`. */
export function calendar(locale: Idioma): Calendario {
  return locale === 'en'
    ? {
        months: en.months,
        monthsShort: en.monthsShort,
        weekdays: en.weekdays,
        weekdaysShort: en.weekdaysShort,
      }
    : {
        months: es.months,
        monthsShort: es.monthsShort,
        weekdays: es.weekdays,
        weekdaysShort: es.weekdaysShort,
      };
}

/** "Octubre 2026" / "October 2026". `month` es 0-based. */
export function monthTitle(locale: Idioma, month: number, year: number): string {
  const name = calendar(locale).months[month] ?? '';
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

/** "12 mar" / "Mar 12". `iso` es un `YYYY-MM-DD`. */
export function formatShortDate(iso: string, locale: Idioma): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const day = String(d);
  return locale === 'en'
    ? `${calendar(locale).monthsShort[m - 1]} ${day}`
    : `${day} ${calendar(locale).monthsShort[m - 1]}`;
}

/** Fecha larga: "12 de marzo de 2026" / "March 12, 2026". */
export function formatLongDate(iso: string, locale: Idioma): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const name = calendar(locale).months[m - 1] ?? '';
  return locale === 'en'
    ? `${name} ${d}, ${y}`
    : `${d} de ${name} de ${y}`;
}

export { DEFAULT_LOCALE };
export type { TranslationKey };