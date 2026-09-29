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
import { validatePassword } from '@/lib/validation';
import { Spacing } from '@/constants/theme';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!name.trim() || !email.trim()) {
      setError('Completá nombre y email.');
      return;
    }
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.ok) {
      setError(passwordCheck.message);
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
      setError(friendlyError(error, 'No se pudo crear la cuenta.'));
      return;
    }

    setLoading(false);

    if (data.session) {
      return;
    }

    Alert.alert(
      'Revisá tu email',
      'Te enviamos un mail de confirmación. Activá la cuenta y después ingresá.'
    );
    setError('Te enviamos un mail de confirmación. Revisá tu casilla (y spam).');
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
        title="Creá tu cuenta"
        subtitle="Empezá a entrenar: tu profe va a armarte una rutina a medida."
      />

      <Card>
        <GoogleButton onPress={handleGoogle} loading={googleLoading} />

        <AuthDivider />

        <Field
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Cómo te llamás"
        />
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
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
        />

        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <Button
          label="Crear cuenta"
          icon="account-plus-outline"
          onPress={handleRegister}
          loading={loading}
        />
      </Card>

      <ThemedText type="small" style={styles.footer}>
        <Link href="/login">¿Ya tenés cuenta? Ingresá</Link>
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
        <Link href="/profe">¿Sos entrenador? Entrá por acá</Link>
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: 'center', marginTop: Spacing.two },
});
