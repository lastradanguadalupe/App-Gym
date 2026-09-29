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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Completá email y contraseña.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      console.warn('[auth] signInWithPassword fallo', error);
      setError('Credenciales inválidas. Revisá tu email y contraseña.');
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.warn('Error con Google', e);
      setError('No se pudo iniciar sesión con Google. Probá de nuevo.');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <Screen>
      <AuthHeader
        title="Bienvenido de nuevo"
        subtitle="Ingresá para ver tu rutina y registrar tus entrenamientos."
      />

      <Card>
        <GoogleButton onPress={handleGoogle} loading={googleLoading} />

        <AuthDivider />

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="tucorreo@mail.com"
        />
        <Field
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          placeholder="••••••••"
        />
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <Button label="Ingresar" icon="login" onPress={handleLogin} loading={loading} />
      </Card>

      <ThemedText type="small" style={styles.footer}>
        <Link href="/register">¿Todavía no tenés cuenta? Registrate</Link>
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
        <Link href="/profe">¿Sos entrenador? Acceso de staff</Link>
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: 'center', marginTop: Spacing.two },
});