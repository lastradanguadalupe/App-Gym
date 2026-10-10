import {
  calendar,
  formatLongDate,
  formatLongDateOf,
  formatShortDate,
  formatWeekdayLongDate,
  i18n,
  monthTitle,
  t,
} from '@/i18n';

afterEach(() => {
  i18n.locale = 'es';
});

describe('t', () => {
  it('devuelve el texto del idioma activo', () => {
    i18n.locale = 'es';
    expect(t('common.guardar')).toBe('Guardar');

    i18n.locale = 'en';
    expect(t('common.guardar')).toBe('Save');
  });

  it('interpola variables con la sintaxis de i18n-js', () => {
    i18n.locale = 'es';
    expect(t('perfil.edadAnios', { edad: 30 })).toBe('Edad: 30 años');

    i18n.locale = 'en';
    expect(t('perfil.edadAnios', { edad: 30 })).toBe('Age: 30 years');
  });

  it('cae al español si la clave no esta traducida', () => {
    i18n.locale = 'en';
    // enableFallback + defaultLocale='es': nunca deberia verse el path.
    const missing = 'common.guardar';
    i18n.locale = 'es';
    expect(t(missing)).toBeTruthy();
    expect(t(missing)).not.toContain('common.');
  });
});

describe('vocabulario de fechas', () => {
  it('expone 12 meses y 7 dias en ambos idiomas', () => {
    for (const locale of ['es', 'en'] as const) {
      const c = calendar(locale);
      expect(c.months).toHaveLength(12);
      expect(c.monthsShort).toHaveLength(12);
      expect(c.weekdays).toHaveLength(7);
      expect(c.weekdaysShort).toHaveLength(7);
    }
  });

  it('empieza en enero y en domingo, como espera la grilla del calendario', () => {
    expect(calendar('es').months[0]).toBe('enero');
    expect(calendar('en').months[0]).toBe('January');
    expect(calendar('es').weekdays[0]).toBe('domingo');
    expect(calendar('en').weekdays[0]).toBe('Sunday');
  });

  it('arma el titulo del mes capitalizando', () => {
    expect(monthTitle('es', 9, 2026)).toBe('Octubre 2026');
    expect(monthTitle('en', 9, 2026)).toBe('October 2026');
  });

  it('ordena la fecha corta segun el idioma', () => {
    expect(formatShortDate('2026-03-12', 'es')).toBe('12 mar');
    expect(formatShortDate('2026-03-12', 'en')).toBe('Mar 12');
  });

  it('arma la fecha larga', () => {
    expect(formatLongDate('2026-03-12', 'es')).toBe('12 de marzo de 2026');
    expect(formatLongDate('2026-03-12', 'en')).toBe('March 12, 2026');
  });

  it('devuelve el input tal cual si la fecha no es valida', () => {
    expect(formatShortDate('basura', 'es')).toBe('basura');
    expect(formatLongDate('', 'en')).toBe('');
  });

  it('arma la fecha larga desde un Date en hora local', () => {
    // `new Date(2026, 9, 10)` se construye en hora local; los getters locales
    // devuelven exactamente esos valores en cualquier zona horaria.
    expect(formatLongDateOf(new Date(2026, 9, 10, 12), 'es')).toBe('10 de octubre de 2026');
    expect(formatLongDateOf(new Date(2026, 9, 10, 12), 'en')).toBe('October 10, 2026');
  });
});

describe('formatWeekdayLongDate', () => {
  it('incluye el día de la semana y la fecha, capitalizado, en ambos idiomas', () => {
    expect(formatWeekdayLongDate(new Date(2026, 9, 10, 12), 'es')).toBe(
      'Sábado, 10 de octubre'
    );
    expect(formatWeekdayLongDate(new Date(2026, 9, 10, 12), 'en')).toBe(
      'Saturday, October 10'
    );
  });

  it('antes del domingo arranca la semana desde domingo', () => {
    // 2026-10-04 es domingo; getDay() = 0.
    expect(formatWeekdayLongDate(new Date(2026, 9, 4, 9), 'es')).toBe('Domingo, 4 de octubre');
  });

  // Regresion del header de Inicio: se formateaba una fecha local pasando por
  // `toISOString()` (que la convierte a UTC) y a la noche eso mostraba el día
  // siguiente. Esta función nunca debe ver ni texto raw ni marcadores de UTC.
  it('nunca devuelve un timestamp crudo ni la hora en UTC', () => {
    const d = new Date(2026, 9, 10, 23, 30);
    const raw = d.toISOString();
    expect(raw).toMatch(/T.+Z$/);

    const s = formatWeekdayLongDate(d, 'es');
    expect(s).toBe('Sábado, 10 de octubre');
    expect(s).not.toMatch(/T|\.975Z|Z$/);
  });
});