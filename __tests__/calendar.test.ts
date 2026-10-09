import {
  countTrainedInMonth,
  daysInMonth,
  isCurrentMonth,
  isIsoDate,
  monthMatrix,
  scaleToRange,
  shiftMonth,
  toIsoDate,
  trainedDays,
  WEEK_LENGTH,
} from '@/lib/calendar';

describe('toIsoDate', () => {
  it('arma el ISO con los getters locales, no con UTC', () => {
    // `new Date('2026-03-12')` es UTC midnight: en Argentina (UTC-3) getDate()
    // devuelve 11 y el ISO saldría corrido un día.
    expect(toIsoDate(new Date(2026, 2, 12))).toBe('2026-03-12');
  });

  it('rellena con ceros los meses y días de un dígito', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('isIsoDate', () => {
  it('acepta una fecha real con formato válido', () => {
    expect(isIsoDate('2026-03-12')).toBe(true);
  });

  it('rechaza formatos que no son AAAA-MM-DD', () => {
    expect(isIsoDate('12/03/2026')).toBe(false);
    expect(isIsoDate('2026-3-12')).toBe(false);
    expect(isIsoDate('2026-03-12T00:00')).toBe(false);
    expect(isIsoDate('')).toBe(false);
  });

  it('rechaza fechas que no existen en el calendario', () => {
    expect(isIsoDate('2026-02-31')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
  });
});

describe('monthMatrix', () => {
  it('ubica el día 1 en la columna que le toca', () => {
    // Octubre 2026 arranca en jueves (getDay() === 4).
    const matrix = monthMatrix({ year: 2026, month: 9 });
    expect(matrix[0].slice(0, 4)).toEqual([null, null, null, null]);
    expect(matrix[0][4]).toBe(1);
  });

  it('arma meses que arrancan en domingo sin celdas vacías al principio', () => {
    const matrix = monthMatrix({ year: 2026, month: 2 }); // marzo 2026: domingo 1
    expect(matrix[0][0]).toBe(1);
  });

  it('siempre devuelve filas completas de 7', () => {
    for (let month = 0; month < 12; month += 1) {
      const matrix = monthMatrix({ year: 2026, month });
      for (const week of matrix) expect(week).toHaveLength(WEEK_LENGTH);
    }
  });

  it('incluye todos los días del mes exactamente una vez', () => {
    const total = monthMatrix({ year: 2026, month: 1 })
      .flat()
      .filter((day): day is number => day !== null);
    expect(total).toHaveLength(daysInMonth({ year: 2026, month: 1 }));
    expect(new Set(total).size).toBe(total.length);
  });

  it('cierra la última semana con null, no con días del mes siguiente', () => {
    const matrix = monthMatrix({ year: 2026, month: 1 }); // 28 días, 4 semanas exactas
    expect(matrix).toHaveLength(4);
  });
});

describe('shiftMonth', () => {
  it('suma y resta dentro del año', () => {
    expect(shiftMonth({ year: 2026, month: 0 }, 1)).toEqual({ year: 2026, month: 1 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });

  it('cruza el año en los dos sentidos', () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, 12)).toEqual({ year: 2027, month: 0 });
  });
});

describe('isCurrentMonth', () => {
  it('reconoce el mes en curso', () => {
    const today = new Date(2026, 9, 3);
    expect(isCurrentMonth({ year: 2026, month: 9 }, today)).toBe(true);
    expect(isCurrentMonth({ year: 2026, month: 8 }, today)).toBe(false);
    expect(isCurrentMonth({ year: 2025, month: 9 }, today)).toBe(false);
  });
});

describe('trainedDays / countTrainedInMonth', () => {
  it('deja solo el día, por si el valor trae hora', () => {
    expect(trainedDays(['2026-10-02T00:00:00.000Z'])).toEqual(new Set(['2026-10-02']));
  });

  it('cuenta los días del mes pedido y no los de al lado', () => {
    const days = trainedDays(['2026-09-30', '2026-10-01', '2026-10-05', '2026-11-02']);
    expect(countTrainedInMonth(days, { year: 2026, month: 9 })).toBe(2);
    expect(countTrainedInMonth(days, { year: 2026, month: 8 })).toBe(1);
    expect(countTrainedInMonth(days, { year: 2026, month: 10 })).toBe(1);
  });

  it('cuenta días repetidos una sola vez', () => {
    // Dos entrenamientos el mismo día siguen siendo un día entrenado.
    const days = trainedDays(['2026-10-05', '2026-10-05']);
    expect(countTrainedInMonth(days, { year: 2026, month: 9 })).toBe(1);
  });
});

describe('scaleToRange', () => {
  it('lleva el mínimo a 0 y el máximo a 1', () => {
    expect(scaleToRange([70, 72, 74])).toEqual([0, 0.5, 1]);
  });

  it('pone la línea en el medio cuando no hay variación', () => {
    // Sin este caso el rango sería cero y la división por NaN vaciaría el gráfico.
    expect(scaleToRange([70, 70])).toEqual([0.5, 0.5]);
  });

  it('devuelve vacío sin datos', () => {
    expect(scaleToRange([])).toEqual([]);
  });

  it('funciona con un solo punto', () => {
    expect(scaleToRange([80])).toEqual([0.5]);
  });
});