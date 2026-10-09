import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { OptionCards, type Option } from '@/components/ui/option-card';
import { Screen, Section } from '@/components/ui/screen';
import { useI18n } from '@/context/i18n';
import { useSession } from '@/context/session';
import { t, type TranslationKey } from '@/i18n';
import {
  accountInfo,
  changePassword,
  requestEmailChange,
  type AuthErrorCode,
} from '@/lib/auth-account';
import { isUsernameTaken, updateProfilePrefs, upsertClientDetails } from '@/lib/db';
import { PASSWORD_MIN_LENGTH, validatePassword } from '@/lib/validation';
import type { Idioma, Sexo } from '@/types';

/**
 * Cada código de `AuthErrorCode` tiene su propio texto: son ramas que el usuario
 * necesita distinguir (ese email ya está usado vs. sesión vencida). Un
 * `Record` con TODAS las claves hace que agregar un código nuevo rompa el
 * typecheck en vez de caer en un mensaje genérico.
 */
const ERROR_KEY: Record<AuthErrorCode, TranslationKey> = {
  email_in_use: 'ajustes.emailEnUso',
  email_invalido: 'ajustes.emailInvalido',
  weak_password: 'ajustes.contrasenaMuyCorta',
  same_password: 'ajustes.contrasenaIgual',
  current_password_mismatch: 'ajustes.contrasenaActualIncorrecta',
  reauth_required: 'ajustes.reautenticacionNecesaria',
  rate_limited: 'ajustes.muchosIntentos',
  sesion_rota: 'ajustes.sesionVencida',
  unknown: 'ajustes.errorDesconocido',
};

const SEXOS: readonly Sexo[] = ['femenino', 'masculino', 'prefiero no decirlo'];

const IDIOMAS: readonly Idioma[] = ['es', 'en'];

const USERNAME_RE = /^[A-Za-z0-9._]{3,30}$/;

export default function AjustesScreen() {
  const { locale, setLocale } = useI18n();
  const { session, profile, clientDetails, refreshProfile, signOut } = useSession();

  const user = session?.user ?? null;
  const info = user ? accountInfo(user) : null;

  // --- Email ---
  const [email, setEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailDone, setEmailDone] = useState<string | null>(null);

  // --- Contraseña ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordDone, setPasswordDone] = useState<string | null>(null);

  // --- Username ---
  const [username, setUsername] = useState('');
  const [usernameBusy, setUsernameBusy] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameDone, setUsernameDone] = useState<string | null>(null);

  // --- Sexo / idioma ---
  const [sexo, setSexo] = useState<Sexo | null>(null);
  const [prefBusy, setPrefBusy] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);

  useEffect(() => {
    setUsername(profile?.username ?? '');
  }, [profile?.username]);

  useEffect(() => {
    setSexo(clientDetails?.sexo ?? null);
  }, [clientDetails?.sexo]);

  const uid = session?.user?.id;

  async function handleEmailChange() {
    if (!uid) return;
    setEmailBusy(true);
    setEmailError(null);
    setEmailDone(null);
    try {
      const result = await requestEmailChange(email);
      if (result.ok) {
        // El email NO cambia en el acto: hay que confirmar el correo nuevo.
        setEmailDone(t('ajustes.emailEnviado', { email: email.trim() }));
        setEmail('');
      } else {
        setEmailError(t(ERROR_KEY[result.code]));
      }
    } finally {
      setEmailBusy(false);
    }
  }

  async function handlePasswordChange() {
    if (!info) return;
    setPasswordBusy(true);
    setPasswordError(null);
    setPasswordDone(null);

    const check = validatePassword(newPassword);
    if (!check.ok) {
      setPasswordError(
        newPassword.length < PASSWORD_MIN_LENGTH
          ? t('ajustes.contrasenaMuyCorta', { min: PASSWORD_MIN_LENGTH })
          : t('ajustes.contrasenaDebil')
      );
      setPasswordBusy(false);
      return;
    }
    if (newPassword !== repeatPassword) {
      setPasswordError(t('ajustes.contrasenasNoCoinciden'));
      setPasswordBusy(false);
      return;
    }

    const result = await changePassword({
      newPassword,
      currentPassword: info.hasPassword ? currentPassword : undefined,
      hasPassword: info.hasPassword,
    });
    setPasswordBusy(false);

    if (result.ok) {
      setPasswordDone(t('ajustes.contrasenaActualizada'));
      setCurrentPassword('');
      setNewPassword('');
      setRepeatPassword('');
    } else {
      setPasswordError(t(ERROR_KEY[result.code]));
    }
  }

  async function handleUsernameSave() {
    if (!uid) return;
    setUsernameBusy(true);
    setUsernameError(null);
    setUsernameDone(null);
    const clean = username.trim();
    try {
      if (!USERNAME_RE.test(clean)) {
        setUsernameError(t('ajustes.usuarioInvalido'));
        return;
      }
      if (await isUsernameTaken(clean, uid)) {
        setUsernameError(t('ajustes.usuarioEnUso'));
        return;
      }
      await updateProfilePrefs(uid, { username: clean });
      await refreshProfile();
      setUsernameDone(t('ajustes.usuarioGuardado'));
    } catch (e) {
      console.warn(e);
      setUsernameError(t('common.errorGenerico'));
    } finally {
      setUsernameBusy(false);
    }
  }

  async function handleSexoChange(next: string) {
    if (!uid || prefBusy) return;
    setPrefBusy(true);
    setPrefError(null);
    try {
      await upsertClientDetails(uid, { sexo: next as Sexo });
      setSexo(next as Sexo);
      await refreshProfile();
    } catch (e) {
      console.warn(e);
      setPrefError(t('common.errorGenerico'));
    } finally {
      setPrefBusy(false);
    }
  }

  async function handleLocaleChange(next: string) {
    if (prefBusy) return;
    setPrefBusy(true);
    setPrefError(null);
    try {
      await setLocale(next as Idioma);
    } catch (e) {
      console.warn(e);
      setPrefError(t('common.errorGenerico'));
    } finally {
      setPrefBusy(false);
    }
  }

  const sexoOptions: Option[] = SEXOS.map((value) => ({
    value,
    label:
      value === 'femenino'
        ? t('ajustes.sexoFemenino')
        : value === 'masculino'
          ? t('ajustes.sexoMasculino')
          : t('ajustes.sexoNoDefinido'),
  }));

  const idiomaOptions: Option[] = IDIOMAS.map((value) => ({
    value,
    label: value === 'es' ? 'Español' : 'English',
  }));

  return (
    <Screen>
      <Section title={t('ajustes.cuenta')}>
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {t('ajustes.correoActual', { email: info?.email ?? '—' })}
          </ThemedText>
          <Field
            label={t('ajustes.nuevoEmail')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={emailError}
          />
          {emailDone ? (
            <ThemedText type="small" themeColor="success">
              {emailDone}
            </ThemedText>
          ) : null}
          <Button
            label={t('ajustes.cambiarEmail')}
            icon="email-edit-outline"
            variant="outline"
            onPress={handleEmailChange}
            loading={emailBusy}
            disabled={!email.trim()}
          />
        </Card>
      </Section>

      <Section title={t('ajustes.cambiarPassword')}>
        <Card>
          {/* Una cuenta de Google no tiene contraseña: el mismo formulario pide
              crear la primera, sin campo de "actual" porque no hay nada que
              verificar. Supabase le agrega la identidad email a la cuenta. */}
          {!info?.hasPassword ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('ajustes.googleSinContrasena')}
              {'\n'}
              {t('ajustes.googleSinContrasenaInfo')}
            </ThemedText>
          ) : (
            <>
              <Field
                label={t('ajustes.contrasenaActual')}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                autoCapitalize="none"
                hint={t('ajustes.contrasenaActualOpcional')}
              />
            </>
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
            error={passwordError}
          />
          {passwordDone ? (
            <ThemedText type="small" themeColor="success">
              {passwordDone}
            </ThemedText>
          ) : null}
          <Button
            label={t('ajustes.cambiarPassword')}
            icon="lock-reset"
            variant="outline"
            onPress={handlePasswordChange}
            loading={passwordBusy}
            disabled={!newPassword || !repeatPassword}
          />
        </Card>
      </Section>

      <Section title={t('ajustes.perfilSeccion')}>
        <Card>
          <Field
            label={t('ajustes.nombreUsuario')}
            value={username}
            onChangeText={setUsername}
            placeholder={t('ajustes.nuevoUsuario')}
            autoCapitalize="none"
            autoCorrect={false}
            error={usernameError}
          />
          {usernameDone ? (
            <ThemedText type="small" themeColor="success">
              {usernameDone}
            </ThemedText>
          ) : null}
          {!profile?.username ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('ajustes.usuarioSinDefinir')}
            </ThemedText>
          ) : null}
          <Button
            label={t('ajustes.guardar')}
            icon="content-save-outline"
            onPress={handleUsernameSave}
            loading={usernameBusy}
            disabled={username.trim() === (profile?.username ?? '')}
          />
        </Card>

        <Card>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t('ajustes.sexo')}
          </ThemedText>
          <OptionCards
            options={sexoOptions}
            value={sexo}
            onChange={handleSexoChange}
            layout="column"
            accessibilityLabel={t('ajustes.sexo')}
          />
        </Card>

        <Card>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t('ajustes.idioma')}
          </ThemedText>
          <OptionCards
            options={idiomaOptions}
            value={locale}
            onChange={handleLocaleChange}
            accessibilityLabel={t('ajustes.idioma')}
          />
        </Card>

        {prefError ? (
          <ThemedText type="small" themeColor="danger">
            {prefError}
          </ThemedText>
        ) : null}
      </Section>

      <Section title={t('ajustes.sesion')}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('ajustes.cerrarSesionInfo')}
        </ThemedText>
        <Button
          variant="danger"
          label={t('common.cerrarSesion')}
          icon="logout"
          onPress={signOut}
        />
      </Section>
    </Screen>
  );
}