import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AuthDivider, AuthHeader } from '@/components/auth-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { GoogleButton } from '@/components/ui/google-button';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { signInWithGoogle } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';
import { Spacing } from '@/constants/theme';
import { t } from '@/i18n';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError(t('auth.faltanCampos'));
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      console.warn('[auth] signInWithPassword fallo', error);
      setError(t('auth.credencialesInvalidas'));
    }
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
      <AuthHeader title={t('auth.bienvenido')} subtitle={t('auth.bienvenidoSubtitulo')} />

      <Card>
        <GoogleButton onPress={handleGoogle} loading={googleLoading} />

        <AuthDivider />

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
          autoComplete="current-password"
          placeholder="••••••••"
        />
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <Button label={t('auth.ingresar')} icon="login" onPress={handleLogin} loading={loading} />
      </Card>

      <ThemedText type="small" style={styles.footer}>
        <Link href="/register">{t('auth.sinCuenta')}</Link>
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
        <Link href="/profe">{t('auth.accesoStaff')}</Link>
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: 'center', marginTop: Spacing.two },
});