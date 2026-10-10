import {
  computeEdad,
  formatDate,
  formatDateTime,
  formatDurationMs,
  formatMinutes,
  parseTags,
  regionLabel,
  regionShort,
  weekdayLabel,
  weekdayLabelsShort,
  weekdayOf,
} from '@/lib/format';

describe('weekdayOf', () => {
  // El schema usa 0=Lunes ... 6=Domingo, pero getDay() usa 0=Domingo.
  // Este off-by-one es justo lo que rompe la programacion semanal.
  const cases: [string, string, number][] = [
    ['2026-01-05T12:00:00', 'lunes', 0],
    ['2026-01-06T12:00:00', 'martes', 1],
    ['2026-01-10T12:00:00', 'sabado', 5],
    ['2026-01-11T12:00:00', 'domingo', 6],
  ];

  it.each(cases)('%s es %s', (iso, _name, expected) => {
    expect(weekdayOf(new Date(iso))).toBe(expected);
  });

  it('mapea todos los dias de la semana sin repetir', () => {
    const seen = new Set<number>();
    for (let day = 5; day <= 11; day++) {
      // Con zero-padding: '2026-01-5' no es ISO 8601 y new Date() lo parsea
      // de forma inconsistente entre runtimes.
      const dd = String(day).padStart(2, '0');
      seen.add(weekdayOf(new Date(`2026-01-${dd}T12:00:00`)));
    }
    expect(seen.size).toBe(7);
    expect(Math.min(...seen)).toBe(0);
    expect(Math.max(...seen)).toBe(6);
  });
});

describe('weekdayLabel', () => {
  it('devuelve la etiqueta correcta para cada indice', () => {
    expect(weekdayLabel('es', 0)).toBe('Lunes');
    expect(weekdayLabel('es', 6)).toBe('Domingo');
  });

  it('normaliza indices fuera de rango', () => {
    expect(weekdayLabel('es', 7)).toBe('Lunes');
    expect(weekdayLabel('es', -1)).toBe('Domingo');
  });

  it('traduce al idioma pedido', () => {
    expect(weekdayLabel('en', 0)).toBe('Monday');
    expect(weekdayLabel('en', 6)).toBe('Sunday');
  });
});

describe('weekdayLabelsShort', () => {
  // El schema arranca en lunes, pero el vocabulario arranca en domingo: este es
  // el mismo off-by-one que weekdayOf invierte, y se nota al pintar los chips.
  it('devuelve los siete dias en orden del schema', () => {
    expect(weekdayLabelsShort('es')).toEqual(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
  });

  it('traduce al idioma pedido', () => {
    expect(weekdayLabelsShort('en')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });
});

describe('computeEdad', () => {
  // computeEdad lee `new Date()`, no `Date.now()`, asi que hay que usar los
  // fake timers de jest: parchear Date.now a mano no alcanza.
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function freeze(iso: string) {
    jest.setSystemTime(new Date(iso));
  }

  it('devuelve null sin fecha o con fecha invalida', () => {
    expect(computeEdad(null)).toBeNull();
    expect(computeEdad('')).toBeNull();
    expect(computeEdad('no-es-una-fecha')).toBeNull();
  });

  it('cumple anios exacto el dia de su cumpleaños', () => {
    freeze('2026-06-15T12:00:00');
    expect(computeEdad('1998-06-15')).toBe(28);
  });

  it('todavia no cumplio y hay que restar uno', () => {
    freeze('2026-06-15T12:00:00');
    expect(computeEdad('1998-06-16')).toBe(27);
  });

  // Regresion: 'YYYY-MM-DD' se parsea como UTC midnight. Leido con getters
  // locales en un offset negativo (Argentina es UTC-3) el dia se correa uno.
  // Justo despues de medianoche del dia del cumpleanos, el parseo erroneo
  // reportaba un año menos de edad.
  it('no se corre un dia por el parseo UTC de fechas sin hora', () => {
    freeze('2026-06-16T00:30:00'); // 16 de junio, 00:30 local (UTC-3)
    expect(computeEdad('1998-06-16')).toBe(28);
  });

  it('rechaza formatos que no son AAAA-MM-DD', () => {
    expect(computeEdad('16/06/1998')).toBeNull();
    expect(computeEdad('1998-6-16')).toBeNull();
    expect(computeEdad('1998-06-16T00:00:00Z')).toBeNull();
  });

  it('un dia antes del cumpleanon resta uno', () => {
    freeze('2026-01-01T12:00:00');
    expect(computeEdad('2000-12-31')).toBe(25);
  });
});

describe('formatDurationMs', () => {
  it('formatea mm:ss bajo una hora', () => {
    expect(formatDurationMs(0)).toBe('00:00');
    expect(formatDurationMs(61_000)).toBe('01:01');
    expect(formatDurationMs(599_000)).toBe('09:59');
  });

  it('formatea h:mm:ss desde una hora', () => {
    expect(formatDurationMs(3_600_000)).toBe('1:00:00');
    expect(formatDurationMs(3_661_000)).toBe('1:01:01');
  });

  it('trunca los milisegundos', () => {
    expect(formatDurationMs(1999)).toBe('00:01');
  });

  it('no produce valores negativos', () => {
    expect(formatDurationMs(-5000)).toBe('00:00');
  });
});

describe('formatMinutes', () => {
  it('usa un guion para null', () => {
    expect(formatMinutes('es', null)).toBe('—');
  });

  it('redondea minutos sueltos', () => {
    expect(formatMinutes('es', 45)).toBe('45 min');
  });

  it('descompone horas y minutos', () => {
    expect(formatMinutes('es', 90)).toBe('1 h 30 min');
    expect(formatMinutes('es', 60)).toBe('1 h');
    expect(formatMinutes('es', 125)).toBe('2 h 5 min');
  });

  it('usa el idioma pedido', () => {
    expect(formatMinutes('en', 45)).toBe('45 min');
    expect(formatMinutes('en', 125)).toBe('2 h 5 min');
  });
});

describe('regionLabel / regionShort', () => {
  it('cubre las cuatro regiones', () => {
    expect(regionLabel('es', 'superior')).toBe('Tren superior');
    expect(regionLabel('es', 'inferior')).toBe('Tren inferior');
    expect(regionLabel('es', 'core')).toBe('Core');
    expect(regionLabel('es', 'full')).toBe('Cuerpo completo');

    expect(regionShort('es', 'superior')).toBe('Sup');
    expect(regionShort('es', 'full')).toBe('Full');
  });

  it('traduce las regiones al idioma pedido', () => {
    expect(regionLabel('en', 'superior')).toBe('Upper body');
    expect(regionLabel('en', 'full')).toBe('Full body');
  });
});

describe('formatDate', () => {
  it('formatea fechas sin hora sin que las corra el mediodía UTC', () => {
    expect(formatDate('2026-03-12', 'es')).toBe('12 de marzo de 2026');
    expect(formatDate('2026-03-12', 'en')).toBe('March 12, 2026');
  });

  it('devuelve la fecha local de un timestamp aunque venga en UTC', () => {
    expect(formatDate('2026-03-12T08:30:00', 'es')).toBe('12 de marzo de 2026');
  });

  it('no pinta basura: devuelve el input si no se puede parsear', () => {
    expect(formatDate('no-es-una-fecha', 'es')).toBe('no-es-una-fecha');
    expect(formatDate('', 'es')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('combina la fecha local con la hora local', () => {
    // ISO sin zona se interpreta como hora local: el resultado es el mismo en
    // cualquier zona horaria del entorno de test.
    expect(formatDateTime('2026-03-12T08:30:00', 'es')).toBe('12 de marzo de 2026 · 08:30');
    expect(formatDateTime('2026-03-12T08:30:00', 'en')).toBe('March 12, 2026 · 08:30');
  });

  it('remapea timestamps de la base (sufijo +00:00) a hora local', () => {
    // Se arma el resultado esperado con los getters locales: la prueba es que
    // no se usa el texto UTC bruto (`clock.slice`) para pintar la hora.
    const d = new Date('2026-03-12T15:30:00+00:00');
    const pad = (n: number) => String(n).padStart(2, '0');
    const expected = `12 de marzo de 2026 · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    expect(formatDateTime('2026-03-12T15:30:00+00:00', 'es')).toBe(expected);
  });

  it('cae a fecha sola si el timestamp no trae hora', () => {
    expect(formatDateTime('2026-03-12', 'es')).toBe('12 de marzo de 2026');
  });
});

describe('parseTags', () => {
  it('parte por coma y recorta espacios', () => {
    expect(parseTags('a, b ,c')).toEqual(['a', 'b', 'c']);
  });

  it('descarta entradas vacias', () => {
    expect(parseTags('a,,  ,b')).toEqual(['a', 'b']);
    expect(parseTags('')).toEqual([]);
    expect(parseTags('   ')).toEqual([]);
  });
});
