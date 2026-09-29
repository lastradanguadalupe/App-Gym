import { friendlyError } from '@/lib/errors';

/** Errores con la forma que devuelve PostgREST/GoTrue. */
function pgError(over: Partial<{ code: string; message: string; details: string; hint: string }>) {
  return { code: 'PGRST301', message: 'JWT expired', details: null, hint: null, ...over };
}

describe('friendlyError', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('traduce los codigos de auth conocidos', () => {
    expect(friendlyError(pgError({ code: 'invalid_credentials' }))).toBe(
      'Email o contrasena incorrectos.'
    );
    expect(friendlyError(pgError({ code: 'email_not_confirmed' }))).toContain('Confirmá tu email');
    expect(friendlyError(pgError({ code: 'user_already_exists' }))).toContain('Ya existe una cuenta');
  });

  it('deja pasar el hint de contrasena debil, que es copy de producto', () => {
    const msg = friendlyError(
      pgError({ code: 'weak_password', hint: 'Password should be at least 8 characters.' })
    );
    expect(msg).toBe('Password should be at least 8 characters.');
  });

  it('traduce rate limits sin exponer el cuerpo del error', () => {
    const msg = friendlyError(
      pgError({
        code: 'over_request_rate_limit',
        message: 'Rate limit for signup exceeded',
        details: 'auth.users: rate limited',
      })
    );
    expect(msg).toMatch(/Demasiados intentos/i);
    expect(msg).not.toContain('auth.users');
  });

  it('deja pasar los errores que escriben nuestros propios RPCs', () => {
    const msg = friendlyError(
      pgError({ message: 'Este ejercicio esta en uso por al menos una rutina.' })
    );
    expect(msg).toBe('Este ejercicio esta en uso por al menos una rutina.');
  });

  it('deja pasar los errores de permisos que escriben nuestros RPCs', () => {
    const msg = friendlyError(pgError({ message: 'Solo un profe puede buscar alumnos' }));
    expect(msg).toBe('Solo un profe puede buscar alumnos');
  });

  // El punto central de todo el modulo: un error de Postgres desconocido no
  // debe filtrar nombres de constraints, columnas ni schema.
  it('oculta message, details, hint y code de cualquier otro error', () => {
    const msg = friendlyError(
      pgError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "profiles_email_key"',
        details: 'Key (email)=(admin@ejemplo.com) already exists.',
        hint: 'Use a different email.',
      })
    );

    expect(msg).toBe('Ocurrio un error inesperado.');
    expect(msg).not.toContain('profiles_email_key');
    expect(msg).not.toContain('admin@ejemplo.com');
    expect(msg).not.toContain('duplicate key');
    expect(msg).not.toContain('23505');
  });

  it('usa el fallback que le pasa el llamador', () => {
    expect(
      friendlyError(
        pgError({ code: '42P01', message: 'relation "staff_allowlist" does not exist' }),
        'Revisa la asignacion del dia.'
      )
    ).toBe('Revisa la asignacion del dia.');
  });

  it('deja el error real en el log para debugging', () => {
    const err = pgError({ code: '23503', message: 'foreign key violation' });
    friendlyError(err);
    expect(warn).toHaveBeenCalledWith(
      '[error] detalle de Supabase no mostrado al usuario',
      err
    );
  });

  it('no rompe con valores que no son errores', () => {
    expect(friendlyError(null)).toBe('Ocurrio un error inesperado.');
    expect(friendlyError(undefined)).toBe('Ocurrio un error inesperado.');
    expect(friendlyError('un string')).toBe('Ocurrio un error inesperado.');
    expect(friendlyError(new Error('boom'))).toBe('Ocurrio un error inesperado.');
  });

  it('no filtra el mensaje de un Error de JS plano', () => {
    const msg = friendlyError(new Error('schema interno: tabla clients_secretas'));
    expect(msg).toBe('Ocurrio un error inesperado.');
    expect(msg).not.toContain('clients_secretas');
  });
});
