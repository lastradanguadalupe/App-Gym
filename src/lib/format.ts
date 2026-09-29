import type { Region } from '@/types';

export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Convierte una fecha JS (getDay: 0=Domingo) al formato del schema (0=Lunes ... 6=Domingo). */
export function weekdayOf(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function weekdayLabel(weekday: number): string {
  return WEEKDAYS[((weekday % 7) + 7) % 7];
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

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString(
    'es-AR',
    { hour: '2-digit', minute: '2-digit' }
  )}`;
}

export function formatDurationMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatMinutes(min: number | null): string {
  if (min == null) return '—';
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

export function regionLabel(region: Region): string {
  switch (region) {
    case 'superior':
      return 'Tren superior';
    case 'inferior':
      return 'Tren inferior';
    case 'core':
      return 'Core';
    case 'full':
      return 'Cuerpo completo';
  }
}

export function regionShort(region: Region): string {
  switch (region) {
    case 'superior':
      return 'Sup';
    case 'inferior':
      return 'Inf';
    case 'core':
      return 'Core';
    case 'full':
      return 'Full';
  }
}

export function experienciaLabel(exp: string | null): string {
  switch (exp) {
    case 'inicio':
      return 'Principiante';
    case 'intermedio':
      return 'Intermedio';
    case 'avanzado':
      return 'Avanzado';
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