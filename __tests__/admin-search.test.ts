import { isEmailQuery, MIN_SEARCH_CHARS, searchOutcome } from '@/lib/admin-search';

describe('isEmailQuery', () => {
  it('reconoce emails', () => {
    expect(isEmailQuery('guadalupe@mail.com')).toBe(true);
    expect(isEmailQuery('  Guadalupe@Mail.COM  ')).toBe(true);
  });

  it('no confunde nombres con emails', () => {
    expect(isEmailQuery('Guadalupe')).toBe(false);
    expect(isEmailQuery('Guadalupe Lastra')).toBe(false);
    expect(isEmailQuery('guadalupe@mail')).toBe(false);
  });
});

describe('searchOutcome', () => {
  it('pide un mínimo de caracteres antes de buscar', () => {
    expect(searchOutcome('g', 0, null)).toBe('minimum');
    expect(searchOutcome('  g ', 0, null)).toBe('minimum');
    expect(MIN_SEARCH_CHARS).toBe(2);
  });

  it('muestra resultados cuando hay coincidencias', () => {
    expect(searchOutcome('guadalupe', 3, null)).toBe('results');
  });

  // El bug original: un email de un alumno asignado a OTRO profe devolvía el
  // mismo cartel que "no existe". Ahora se distinguen.
  it('distingue "ya tiene otro profe" solo con email exacto', () => {
    expect(searchOutcome('guadalupe@mail.com', 0, 'other')).toBe('otherProfe');
    // Con nombre, aunque exista asignado a otro, no se revela: cae en genérico.
    expect(searchOutcome('Guadalupe', 0, 'other')).toBe('emptyName');
  });

  it('separa el vacío por email del vacío por nombre', () => {
    expect(searchOutcome('guadalupe@mail.com', 0, 'none')).toBe('emptyEmail');
    expect(searchOutcome('guadalupe@mail.com', 0, null)).toBe('emptyEmail');
    expect(searchOutcome('Guadalupe', 0, null)).toBe('emptyName');
  });

  // 'mine' nunca debería llegar con 0 resultados (los propios se devuelven),
  // pero si pasara no hay que decir "ya tiene profe".
  it('no trata "mine" como otro profe', () => {
    expect(searchOutcome('guadalupe@mail.com', 0, 'mine')).toBe('emptyEmail');
  });
});
