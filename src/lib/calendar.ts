/**
 * Helpers puros del calendario mensual de asistencia.
 *
 * Todo lo que decide la grilla vive acá y es testeable sin renderizar: el
 * componente solo dibuja lo que estas funciones devuelven.
 *
 * Convención de fechas: las sesiones y las mediciones se guardan como
 * `YYYY-MM-DD` en hora local. `new Date('2026-03-12')` se parsea como UTC
 * midnight, así que un `getDate()` sobre ese string corre un día en Argentina
 * (UTC-3). Por eso el ISO se arma a mano desde los getters locales.
 */

export const WEEK_LENGTH = 7;

/** `YYYY-MM-DD` en hora local, que es como se guardan las filas en la base. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** `true` si el string es una fecha `YYYY-MM-DD` que existe en el calendario. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  // El overflow (31 de febrero) hace que los getters no devuelvan lo pedido.
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export type Mes = { year: number; month: number };

/**
 * Grilla de un mes: semanas de 7 celdas, en filas de `WEEK_LENGTH`.
 *
 * Empieza en domingo (`getDay() === 0`) y las celdas fuera del mes son `null`,
 * que el componente dibuja vacías. Siempre devuelve filas completas: un mes de
 * 31 días que empieza en sábado ocupa 6 semanas.
 */
export function monthMatrix({ year, month }: Mes): (number | null)[][] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % WEEK_LENGTH !== 0) cells.push(null);

  return Array.from({ length: cells.length / WEEK_LENGTH }, (_, week) =>
    cells.slice(week * WEEK_LENGTH, week * WEEK_LENGTH + WEEK_LENGTH)
  );
}

/** Cantidad de días del mes, para saber cuántas filas tiene la grilla. */
export function daysInMonth({ year, month }: Mes): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Suma un mes, cruzando el año. `month` es 0-based. */
export function shiftMonth({ year, month }: Mes, delta: number): Mes {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** ¿El mes mostrado es el mes en curso? */
export function isCurrentMonth({ year, month }: Mes, today = new Date()): boolean {
  return year === today.getFullYear() && month === today.getMonth();
}

/**
 * Lunes a las 00:00 (hora local) de la semana que contiene `date`.
 *
 * El dashboard del profe agrupa "esta semana" de lunes a domingo. El servidor no
 * conoce el huso del usuario, así que el rango se calcula acá y se pasa a la RPC
 * como timestamptz. `date.getDay()` usa 0=domingo, así que el lunes queda a 6
 * días de distancia cuando caemos en domingo.
 */
export function startOfWeekMonday(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (monday.getDay() + 6) % WEEK_LENGTH;
  monday.setDate(monday.getDate() - daysSinceMonday);
  return monday;
}

/** Días con al menos un entrenamiento Completado, como `YYYY-MM-DD`. */
export function trainedDays(completedOn: readonly string[]): Set<string> {
  return new Set(completedOn.map((iso) => iso.slice(0, 10)));
}

/** Cuántos días entrenados caen dentro del mes (no cuenta los de otros meses). */
export function countTrainedInMonth(days: ReadonlySet<string>, mes: Mes): number {
  const prefix = `${mes.year}-${String(mes.month + 1).padStart(2, '0')}-`;
  let count = 0;
  for (const iso of days) {
    if (iso.startsWith(prefix)) count += 1;
  }
  return count;
}

/**
 * Escala del eje Y del gráfico: valores escalados a 0–1 dentro del rango.
 *
 * Un peso plano (una sola medición, o siempre el mismo) daría rango cero y
 * dividiría por cero: en ese caso devuelve siempre 0.5, que dibuja la línea en
 * el medio sin inventar variaciones.
 */
export function scaleToRange(values: readonly number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map((value) => (value - min) / (max - min));
}