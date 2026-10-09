import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { AuthDivider, AuthHeader } from '@/components/auth-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { GoogleButton } from '@/components/ui/google-button';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { friendlyError } from '@/lib/errors';
import { signInWithGoogle } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';
import { PASSWORD_MIN_LENGTH, validatePassword } from '@/lib/validation';
import { Spacing } from '@/constants/theme';
import { t } from '@/i18n';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!name.trim() || !email.trim()) {
      setError(t('auth.faltanCamposRegistro'));
      return;
    }
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.ok) {
      setError(t(passwordCheck.key, { min: PASSWORD_MIN_LENGTH }));
      return;
    }
    setLoading(true);
    setError(null);

    // Sin `role` en el metadata a propósito: el trigger de Supabase decide el rol
    // desde la allow-list, así que desde acá nadie puede pedir ser profe.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
      },
    });

    if (error) {
      setLoading(false);
      setError(friendlyError(error, 'auth.crearCuentaError'));
      return;
    }

    setLoading(false);

    if (data.session) {
      return;
    }

    Alert.alert(t('auth.revisaTuEmail'), t('auth.emailConfirmacion'));
    setError(t('auth.emailConfirmacionCorta'));
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.warn('Error con Google', e);
      setError(t('auth.googleError'));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <Screen>
      <AuthHeader title={t('auth.creaTuCuenta')} subtitle={t('auth.creaTuCuentaSubtitulo')} />

      <Card>
        <GoogleButton onPress={handleGoogle} loading={googleLoading} />

        <AuthDivider />

        <Field
          label={t('common.nombre')}
          value={name}
          onChangeText={setName}
          placeholder={t('auth.placeholderComoTeLlamas')}
        />
        <Field
          label={t('ajustes.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder={t('common.placeholderEmail')}
        />
        <Field
          label={t('ajustes.contrasena')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          placeholder={t('ajustes.contrasenaMuyCorta', { min: PASSWORD_MIN_LENGTH })}
        />

        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <Button
          label={t('auth.crearCuenta')}
          icon="account-plus-outline"
          onPress={handleRegister}
          loading={loading}
        />
      </Card>

      <ThemedText type="small" style={styles.footer}>
        <Link href="/login">{t('auth.yaTenesCuenta')}</Link>
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
        <Link href="/profe">{t('auth.entradaProfe')}</Link>
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: 'center', marginTop: Spacing.two },
});
