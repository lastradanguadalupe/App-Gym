import {
  EMPTY_REPS,
  compactSummary,
  formatRest,
  formatWeight,
  parseReps,
  repsAreValid,
  restOptions,
  serializeReps,
  seriesOptions,
  weightOptions,
} from '@/lib/routine-params';

describe('parseReps / serializeReps', () => {
  it('redondea el ida y vuelta de un número fijo', () => {
    const draft = parseReps('12');
    expect(draft).toEqual({ mode: 'fijo', fijo: 12, min: null, max: null });
    expect(serializeReps(draft)).toBe('12');
  });

  it('redondea el ida y vuelta de un rango', () => {
    const draft = parseReps('10-12');
    expect(draft).toEqual({ mode: 'rango', fijo: null, min: 10, max: 12 });
    expect(serializeReps(draft)).toBe('10-12');
  });

  it('reconoce "al fallo" en cualquier capitalización', () => {
    expect(serializeReps(parseReps('Al Fallo'))).toBe('al fallo');
  });

  it('trata vacío o desconocido como sin definir', () => {
    expect(parseReps('')).toEqual(EMPTY_REPS);
    expect(parseReps(null)).toEqual(EMPTY_REPS);
    expect(serializeReps(EMPTY_REPS)).toBeNull();
  });
});

describe('repsAreValid', () => {
  it('exige series para el modo fijo', () => {
    expect(repsAreValid({ mode: 'fijo', fijo: null, min: null, max: null })).toBe(false);
    expect(repsAreValid({ mode: 'fijo', fijo: 8, min: null, max: null })).toBe(true);
  });

  it('rechaza un rango invertido', () => {
    expect(repsAreValid({ mode: 'rango', fijo: null, min: 12, max: 10 })).toBe(false);
    expect(repsAreValid({ mode: 'rango', fijo: null, min: 10, max: 12 })).toBe(true);
  });

  it('acepta "al fallo" sin números', () => {
    expect(repsAreValid({ mode: 'fallo', fijo: null, min: null, max: null })).toBe(true);
  });
});

describe('formatRest', () => {
  it('formatea segundos, minutos y combinados', () => {
    expect(formatRest('es', 45)).toBe('45 s');
    expect(formatRest('es', 60)).toBe('1 min');
    expect(formatRest('es', 90)).toBe('1 min 30 s');
    expect(formatRest('es', 300)).toBe('5 min');
  });

  it('sin definir es null', () => {
    expect(formatRest('es', null)).toBeNull();
  });
});

describe('formatWeight', () => {
  it('distingue peso corporal (0) de sin definir (null)', () => {
    expect(formatWeight('es', 0)).toBe('Peso corporal');
    expect(formatWeight('es', 20)).toBe('20 kg');
    expect(formatWeight('es', 22.5)).toBe('22,5 kg');
    expect(formatWeight('es', null)).toBeNull();
  });
});

describe('compactSummary', () => {
  const base = { sets: null, reps: null, rest_seconds: null, peso_kg: null };

  it('omite lo que no está definido y muestra "—" si no hay nada', () => {
    expect(compactSummary('es', base)).toBe('—');
    expect(compactSummary('es', { ...base, sets: 3, reps: '10-12' })).toBe('3 × 10-12');
    expect(compactSummary('es', { ...base, sets: 3, reps: '10-12', rest_seconds: 60 })).toBe(
      '3 × 10-12 · 1 min'
    );
    expect(
      compactSummary('es', { sets: 3, reps: '10', rest_seconds: 90, peso_kg: 20 })
    ).toBe('3 × 10 · 1 min 30 s · 20 kg');
  });

  it('no rompe si solo hay series o solo reps', () => {
    expect(compactSummary('es', { ...base, sets: 4 })).toBe('4 series');
    expect(compactSummary('es', { ...base, reps: '12' })).toBe('12');
  });
});

describe('opciones de los selectores', () => {
  it('series va de 1 a 10', () => {
    expect(seriesOptions()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('descanso va de 15 en 15 hasta 300', () => {
    const rest = restOptions();
    expect(rest[0]).toBe(15);
    expect(rest[rest.length - 1]).toBe(300);
    expect(rest[1] - rest[0]).toBe(15);
  });

  it('peso con paso 0.5 no arrastra error de flotantes', () => {
    const values = weightOptions(0.5);
    expect(values[0]).toBe(0);
    expect(values[1]).toBe(0.5);
    expect(values[2]).toBe(1);
    expect(values).toContain(0.5);
    expect(new Set(values).size).toBe(values.length);
  });
});
