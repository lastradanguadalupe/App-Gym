import { calendar, formatLongDate, formatLongDateOf, tIn } from '@/i18n';
import type { Idioma, Region } from '@/types';

/**
 * El weekday del schema es 0=Lunes ... 6=Domingo, pero el vocabulario de
 * `calendar` arranca en domingo como `Date.getDay()`. `weekdayLabel` lo corrige
 * con este offset.
 */
const DOMINGO_OFFSET = 1;

/** Los días del diccionario van en minúscula: acá se capitalizan para pintar. */
function capitalize(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Convierte una fecha JS (getDay: 0=Domingo) al formato del schema (0=Lunes ... 6=Domingo). */
export function weekdayOf(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function weekdayLabel(locale: Idioma, weekday: number): string {
  const { weekdays } = calendar(locale);
  return capitalize(weekdays[((((weekday + DOMINGO_OFFSET) % 7) + 7) % 7)] ?? '');
}

/** Los siete días en orden del schema, para pintar una fila de weekdays. */
export function weekdayLabelsShort(locale: Idioma): readonly string[] {
  const { weekdaysShort } = calendar(locale);
  return Array.from({ length: 7 }, (_, weekday) => {
    const label = weekdaysShort[((((weekday + DOMINGO_OFFSET) % 7) + 7) % 7)] ?? '';
    return capitalize(label);
  });
}

export function computeEdad(fechaNac: string | null): number | null {
  if (!fechaNac) return null;

  // `new Date('1998-06-16')` se parsea como UTC midnight, pero despues se lee
  // con getters locales. En un offset negativo eso corre la fecha un dia
  // (en Argentina, UTC-3: 1998-06-16T00:00Z es 1998-06-15 21:00 local), y la
  // edad queda mal exactamente alrededor del cumpleanos. Se parsea a mano
  // para que la fecha sea siempre local.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaNac.trim());
  if (!match) return null;

  const born = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(born.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1;
  return age;
}

/**
 * Fecha larga de un timestamp (`timestamptz`) o de un `YYYY-MM-DD`.
 *
 * Los timestamps de la base vienen en UTC; se formatean con los getters locales
 * para mostrar el día del usuario. Las fechas sin hora se parsean a mano (con
 * `formatLongDate`) para que no las corra el mediodía UTC.
 */
export function formatDate(iso: string, locale: Idioma): string {
  const value = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatLongDate(value, locale);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return iso;
  return formatLongDateOf(date, locale);
}

/** Fecha y hora locales de un timestamp: "10 de octubre de 2026 · 09:30". */
export function formatDateTime(iso: string, locale: Idioma): string {
  const value = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value, locale);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value, locale);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${formatLongDateOf(date, locale)} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDurationMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatMinutes(locale: Idioma, min: number | null): string {
  if (min == null) return '—';
  if (min < 60) return tIn(locale, 'format.minutos', { min: Math.round(min) });
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0
    ? tIn(locale, 'format.horasMinutos', { h, min: m })
    : tIn(locale, 'format.horas', { h });
}

/**
 * Tiempo relativo para fechas recientes: "Hoy", "Ayer", "Hace 3 días", "Hace 2
 * semanas", "Hace 5 meses". Se usa en el dashboard del profe ("seguir donde
 * quedamos", actividad reciente).
 *
 * Se mide por bloques de 24 h transcurridas, no por día de calendario: alcanza
 * para el uso (qué tan reciente es) y evita depender del huso al parsear un
 * timestamptz.
 */
export function formatRelativeTime(locale: Idioma, iso: string | null): string {
  if (!iso) return '—';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '—';

  const days = Math.floor(Math.max(0, Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return tIn(locale, 'format.hoy');
  if (days === 1) return tIn(locale, 'format.ayer');
  if (days < 7) return tIn(locale, 'format.haceDias', { count: days });

  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return weeks === 1
      ? tIn(locale, 'format.haceUnaSemana')
      : tIn(locale, 'format.haceSemanas', { count: weeks });
  }

  const months = Math.floor(days / 30);
  return months <= 1
    ? tIn(locale, 'format.haceUnMes')
    : tIn(locale, 'format.haceMeses', { count: months });
}

export function regionLabel(locale: Idioma, region: Region): string {
  return tIn(locale, `region.${region}`);
}

export function regionShort(locale: Idioma, region: Region): string {
  return tIn(locale, `regionShort.${region}`);
}

export function experienciaLabel(locale: Idioma, exp: string | null): string {
  switch (exp) {
    case 'inicio':
      return tIn(locale, 'experiencia.inicio');
    case 'intermedio':
      return tIn(locale, 'experiencia.intermedio');
    case 'avanzado':
      return tIn(locale, 'experiencia.avanzado');
    default:
      return '—';
  }
}

export function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}