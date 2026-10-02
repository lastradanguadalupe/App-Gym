import {
  accountInfo,
  changePassword,
  requestEmailChange,
} from '@/lib/auth-account';

const mockUpdateUser = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { updateUser: (...args: unknown[]) => mockUpdateUser(...args) } },
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Arma un `User` mínimo: `accountInfo` solo mira email e identities. */
function user(providers: string[]) {
  return {
    email: 'a@b.com',
    identities: providers.map((provider) => ({ provider })),
  } as never;
}

describe('accountInfo', () => {
  it('marca hasPassword cuando existe la identidad email', () => {
    expect(accountInfo(user(['email']))).toMatchObject({ hasPassword: true, usedGoogle: false });
  });

  it('marca una cuenta de Google sin contraseña', () => {
    expect(accountInfo(user(['google']))).toMatchObject({ hasPassword: false, usedGoogle: true });
  });

  it('reconoce una cuenta de Google que ya sumó contraseña', () => {
    expect(accountInfo(user(['google', 'email']))).toMatchObject({
      hasPassword: true,
      usedGoogle: true,
    });
  });
});

describe('requestEmailChange', () => {
  it('devuelve ok cuando Supabase acepta el cambio', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    await expect(requestEmailChange('  nuevo@b.com ')).resolves.toEqual({ ok: true });
    // El email se recorta antes de mandarlo.
    expect(mockUpdateUser).toHaveBeenCalledWith({ email: 'nuevo@b.com' });
  });

  it('traduce email_exists a email_in_use', async () => {
    mockUpdateUser.mockResolvedValue({ error: { code: 'email_exists' } });
    await expect(requestEmailChange('a@b.com')).resolves.toEqual({
      ok: false,
      code: 'email_in_use',
    });
  });

  it('traduce validation_failed a email_invalido', async () => {
    mockUpdateUser.mockResolvedValue({ error: { code: 'validation_failed' } });
    await expect(requestEmailChange('roto')).resolves.toEqual({
      ok: false,
      code: 'email_invalido',
    });
  });
});

describe('changePassword', () => {
  it('rechaza una contraseña corta sin llamar a Supabase', async () => {
    await expect(
      changePassword({ newPassword: 'corta', hasPassword: true, currentPassword: 'x' })
    ).resolves.toEqual({ ok: false, code: 'weak_password' });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('manda current_password cuando la cuenta ya tiene contraseña', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    await expect(
      changePassword({ newPassword: 'Nueva123', hasPassword: true, currentPassword: 'Vieja123' })
    ).resolves.toEqual({ ok: true });
    expect(mockUpdateUser).toHaveBeenCalledWith({
      password: 'Nueva123',
      current_password: 'Vieja123',
    });
  });

  it('omite current_password en una cuenta OAuth que crea su primera contraseña', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    await expect(
      changePassword({ newPassword: 'Nueva123', hasPassword: false })
    ).resolves.toEqual({ ok: true });
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'Nueva123' });
  });

  it('traduce current_password_mismatch', async () => {
    mockUpdateUser.mockResolvedValue({ error: { code: 'current_password_mismatch' } });
    await expect(
      changePassword({ newPassword: 'Nueva123', hasPassword: true, currentPassword: 'mala' })
    ).resolves.toEqual({ ok: false, code: 'current_password_mismatch' });
  });

  it('traduce same_password', async () => {
    mockUpdateUser.mockResolvedValue({ error: { code: 'same_password' } });
    await expect(
      changePassword({ newPassword: 'Nueva123', hasPassword: true, currentPassword: 'Nueva123' })
    ).resolves.toEqual({ ok: false, code: 'same_password' });
  });

  it('traduce reauthentication_needed', async () => {
    mockUpdateUser.mockResolvedValue({ error: { code: 'reauthentication_needed' } });
    await expect(
      changePassword({ newPassword: 'Nueva123', hasPassword: true, currentPassword: 'x' })
    ).resolves.toEqual({ ok: false, code: 'reauth_required' });
  });
});