import {
  ALTURA_MAX,
  ALTURA_MIN,
  ALTURA_SUGERIDA,
  EDAD_SUGERIDA_ANIOS,
  PESO_MAX,
  PESO_MIN,
  PESO_STEP,
  PESO_SUGERIDO,
  alturaOptions,
  birthDateBounds,
  clampMonth,
  earlierThanMonth,
  isBirthDateAllowed,
  monthOfIso,
  pesoOptions,
  sexoOptions,
  suggestedBirthMonth,
  withExactValue,
} from '@/lib/body-profile';

const TODAY = new Date(2026, 9, 10); // 10 de octubre de 2026

describe('pesoOptions', () => {
  it('cubre 30–250 kg en pasos de 0,5', () => {
    const options = pesoOptions('es');
    expect(options[0].value).toBe(PESO_MIN);
    expect(options[1].value).toBe(PESO_MIN + PESO_STEP);
    expect(options[options.length - 1].value).toBe(PESO_MAX);
    // (250 - 30) / 0,5 + 1 = 441 valores.
    expect(options).toHaveLength((PESO_MAX - PESO_MIN) / PESO_STEP + 1);
  });

  it('etiqueta con la unidad y el separador decimal del idioma', () => {
    const options = pesoOptions('es');
    const medio = options.find((option) => option.value === PESO_MIN + PESO_STEP);
    expect(medio?.label).toBe('30,5 kg');
    expect(pesoOptions('en').find((option) => option.value === PESO_MIN + PESO_STEP)?.label).toBe(
      '30.5 kg'
    );
  });

  it('no arrastra error de flotantes al acumular medios kilos', () => {
    for (const option of pesoOptions('es')) {
      expect(Number.isInteger((option.value as number) * 10)).toBe(true);
    }
  });

  it('el valor sugerido cae dentro de la grilla', () => {
    const values = pesoOptions('es').map((option) => option.value);
    expect(values).toContain(PESO_SUGERIDO);
  });
});

describe('alturaOptions', () => {
  it('cubre 120–220 cm de a 1', () => {
    const options = alturaOptions('es');
    expect(options[0].value).toBe(ALTURA_MIN);
    expect(options[options.length - 1].value).toBe(ALTURA_MAX);
    expect(options).toHaveLength(ALTURA_MAX - ALTURA_MIN + 1);
  });

  it('etiqueta con centímetros', () => {
    expect(alturaOptions('es').find((option) => option.value === ALTURA_SUGERIDA)?.label).toBe(
      '165 cm'
    );
  });
});

describe('sexoOptions', () => {
  it('respeta el orden de SEXOS y traduce las etiquetas', () => {
    expect(sexoOptions('es').map((option) => option.value)).toEqual([
      'masculino',
      'femenino',
      'prefiero no decirlo',
    ]);
    expect(sexoOptions('es')[0].label).toBe('Masculino');
    expect(sexoOptions('en')[0].label).toBe('Male');
  });
});

describe('birthDateBounds / isBirthDateAllowed', () => {
  it('el máximo es hoy y el mínimo, 100 años atrás', () => {
    const { minIso, maxIso } = birthDateBounds(TODAY);
    expect(maxIso).toBe('2026-10-10');
    expect(minIso).toBe('1926-10-10');
  });

  it('acepta una fecha dentro del rango', () => {
    expect(isBirthDateAllowed('2001-02-20', TODAY)).toBe(true);
  });

  it('acepta justo los bordes', () => {
    const { minIso, maxIso } = birthDateBounds(TODAY);
    expect(isBirthDateAllowed(minIso, TODAY)).toBe(true);
    expect(isBirthDateAllowed(maxIso, TODAY)).toBe(true);
  });

  it('rechaza el futuro y fechas de más de 100 años', () => {
    expect(isBirthDateAllowed('2026-10-11', TODAY)).toBe(false);
    expect(isBirthDateAllowed('1926-10-09', TODAY)).toBe(false);
  });

  it('rechaza formatos inválidos', () => {
    expect(isBirthDateAllowed('20/02/2001', TODAY)).toBe(false);
    expect(isBirthDateAllowed('', TODAY)).toBe(false);
  });
});

describe('suggestedBirthMonth', () => {
  it('abre el calendario ~25 años atrás, no en el mes actual', () => {
    expect(suggestedBirthMonth(TODAY)).toEqual({
      year: TODAY.getFullYear() - EDAD_SUGERIDA_ANIOS,
      month: TODAY.getMonth(),
    });
  });
});

describe('monthOfIso', () => {
  it('parsea sin corrimiento de zona horaria', () => {
    expect(monthOfIso('2001-02-20')).toEqual({ year: 2001, month: 1 });
  });

  it('responde al mínimo de birthDateBounds', () => {
    const { minIso } = birthDateBounds(TODAY);
    expect(monthOfIso(minIso)).toEqual({ year: 1926, month: 9 });
  });
});

describe('withExactValue', () => {
  const options = pesoOptions('es');

  it('deja la lista igual si el valor ya está', () => {
    expect(withExactValue(options, 72.5, (v) => String(v))).toBe(options);
  });

  it('deja la lista igual si no hay valor (sin elegir)', () => {
    expect(withExactValue(options, null, (v) => String(v))).toBe(options);
  });

  it('inserta un valor fuera de la grilla, ordenado', () => {
    const next = withExactValue(options, 72.3, (v) => `${v} kg`);
    expect(next).not.toBe(options);
    const index = next.findIndex((option) => option.value === 72.3);
    expect(index).toBeGreaterThan(0);
    expect(next[index].label).toBe('72.3 kg');
    // Queda entre 72 y 72,5.
    expect(next[index - 1].value).toBe(72);
    expect(next[index + 1].value).toBe(72.5);
  });
});

describe('earlierThanMonth / clampMonth', () => {
  const min = { year: 2000, month: 0 };
  const max = { year: 2026, month: 9 };

  it('compara por año y luego por mes', () => {
    expect(earlierThanMonth({ year: 2010, month: 5 }, { year: 2010, month: 6 })).toBe(true);
    expect(earlierThanMonth({ year: 2010, month: 6 }, { year: 2010, month: 6 })).toBe(false);
    expect(earlierThanMonth({ year: 2027, month: 0 }, { year: 2026, month: 11 })).toBe(false);
  });

  it('recorta el mes a los límites', () => {
    expect(clampMonth({ year: 1999, month: 11 }, min, max)).toEqual(min);
    expect(clampMonth({ year: 2030, month: 0 }, min, max)).toEqual(max);
    expect(clampMonth({ year: 2010, month: 5 }, min, max)).toEqual({ year: 2010, month: 5 });
  });
});
