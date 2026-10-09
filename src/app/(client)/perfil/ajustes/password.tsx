import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Screen, Section } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { accountInfo, changePassword } from '@/lib/auth-account';
import { PASSWORD_MIN_LENGTH, validatePassword } from '@/lib/validation';
import { AUTH_ERROR_KEY } from '@/i18n/auth-errors';
import { t } from '@/i18n';

/**
 * Cambio de contraseña.
 *
 * Una cuenta creada con Google no tiene contraseña: el mismo formulario pide
 * crear la primera, sin campo de "actual" porque no hay nada que verificar.
 * Supabase le agrega la identidad de email a la cuenta y desde ese momento el
 * usuario entra con email y contraseña. La condición sale de `accountInfo`, que
 * mira `identities` y no de adivinar por el proveedor principal.
 */
export default function PasswordScreen() {
  const { session } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const user = session?.user ?? null;
  const info = user ? accountInfo(user) : null;
  const hasPassword = info?.hasPassword ?? false;

  async function handleChange() {
    setBusy(true);
    setError(null);
    setDone(null);

    const check = validatePassword(newPassword);
    if (!check.ok) {
      setError(
        newPassword.length < PASSWORD_MIN_LENGTH
          ? t('ajustes.contrasenaMuyCorta', { min: PASSWORD_MIN_LENGTH })
          : t('ajustes.contrasenaDebil')
      );
      setBusy(false);
      return;
    }
    if (newPassword !== repeatPassword) {
      setError(t('ajustes.contrasenasNoCoinciden'));
      setBusy(false);
      return;
    }

    const result = await changePassword({
      newPassword,
      currentPassword: hasPassword ? currentPassword : undefined,
      hasPassword,
    });
    setBusy(false);

    if (result.ok) {
      setDone(t('ajustes.contrasenaActualizada'));
      setCurrentPassword('');
      setNewPassword('');
      setRepeatPassword('');
    } else {
      setError(t(AUTH_ERROR_KEY[result.code]));
    }
  }

  return (
    <Screen>
      <Section title={t('ajustes.contrasena')}>
        <Card>
          {hasPassword ? (
            <Field
              label={t('ajustes.contrasenaActual')}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              autoCapitalize="none"
              hint={t('ajustes.contrasenaActualOpcional')}
            />
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {t('ajustes.googleSinContrasena')}
              {'\n'}
              {t('ajustes.googleSinContrasenaInfo')}
            </ThemedText>
          )}

          <Field
            label={t('ajustes.nuevaContrasena')}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Field
            label={t('ajustes.repetirContrasena')}
            value={repeatPassword}
            onChangeText={setRepeatPassword}
            secureTextEntry
            autoCapitalize="none"
            error={error}
          />

          {done ? (
            <ThemedText type="small" themeColor="success">
              {done}
            </ThemedText>
          ) : null}

          <Button
            label={t('ajustes.cambiarPassword')}
            icon="lock-reset"
            variant="outline"
            onPress={handleChange}
            loading={busy}
            disabled={!newPassword || !repeatPassword}
          />
        </Card>
      </Section>
    </Screen>
  );
}