import {
  computeEdad,
  formatDurationMs,
  formatMinutes,
  parseTags,
  regionLabel,
  regionShort,
  weekdayLabel,
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
    expect(weekdayLabel(0)).toBe('Lunes');
    expect(weekdayLabel(6)).toBe('Domingo');
  });

  it('normaliza indices fuera de rango', () => {
    expect(weekdayLabel(7)).toBe('Lunes');
    expect(weekdayLabel(-1)).toBe('Domingo');
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
    expect(formatMinutes(null)).toBe('—');
  });

  it('redondea minutos sueltos', () => {
    expect(formatMinutes(45)).toBe('45 min');
  });

  it('descompone horas y minutos', () => {
    expect(formatMinutes(90)).toBe('1 h 30 min');
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(125)).toBe('2 h 5 min');
  });
});

describe('regionLabel / regionShort', () => {
  it('cubre las cuatro regiones', () => {
    expect(regionLabel('superior')).toBe('Tren superior');
    expect(regionLabel('inferior')).toBe('Tren inferior');
    expect(regionLabel('core')).toBe('Core');
    expect(regionLabel('full')).toBe('Cuerpo completo');

    expect(regionShort('superior')).toBe('Sup');
    expect(regionShort('full')).toBe('Full');
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
