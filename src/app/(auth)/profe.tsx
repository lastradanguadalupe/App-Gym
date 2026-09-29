import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { fetchProfile } from '@/lib/db';
import { friendlyError } from '@/lib/errors';
import { authCallbackUri } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';
import { validatePassword } from '@/lib/validation';
import { gradientStyle, Gradients, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const NOT_ALLOWED =
  'Ese email no está habilitado como entrenador. Pedile a un profe que te agregue desde su panel.';

/**
 * Alta de entrenador. A propósito es una pantalla aparte de `/register` (la de
 * alumnos): sin Google, con su propio copy y validando contra la allow-list que
 * controla el trigger `handle_new_user`. Si el email no está en la lista, la
 * cuenta se crea igual pero como cliente, así que la deslogueamos acá.
 */
export default function ProfeRegisterScreen() {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: authCallbackUri(),
        data: { full_name: name.trim(), role: 'profe' },
      },
    });

    if (error) {
      setLoading(false);
      console.warn('[auth] signUp (profe) fallo', error);
      setError(friendlyError(error, 'No se pudo crear la cuenta.'));
      return;
    }

    if (!data.session || !data.user) {
      setLoading(false);
      Alert.alert(
        'Revisá tu email',
        'Te enviamos un mail de confirmación. Activá la cuenta y después ingresá.'
      );
      setError('Te enviamos un mail de confirmación. Revisá tu casilla (y spam).');
      return;
    }

    // El trigger decide el rol según la allow-list. Comprobamos qué nos quedó.
    let isProfe = false;
    try {
      isProfe = (await fetchProfile(data.user.id)).role === 'profe';
    } catch {
      isProfe = false;
    }

    if (!isProfe) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(NOT_ALLOWED);
      return;
    }

    router.replace('/panel');
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View
          style={[
            styles.mark,
            { backgroundColor: theme.teal },
            gradientStyle(Gradients.accent),
          ]}>
          <MaterialCommunityIcons name="account-tie-outline" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="eyebrow" themeColor="textSecondary">
            Acceso de entrenadores
          </ThemedText>
          <ThemedText type="display">Panel del profe</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Gestioná alumnos, rutinas y contenido del gimnasio.
          </ThemedText>
        </View>
      </View>

      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Tu cuenta se activa solo si un profe ya habilitó tu email. Si sos el primero
          del gimnasio, corré el script de bootstrap en el panel de Supabase.
        </ThemedText>

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
          placeholder="tu@mail.com"
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
          label="Crear cuenta de entrenador"
          icon="account-tie-outline"
          onPress={handleRegister}
          loading={loading}
        />
      </Card>

      <View style={styles.links}>
        <ThemedText type="small" style={styles.center}>
          <Link href="/login">Ya tengo cuenta, quiero ingresar</Link>
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          <Link href="/register">Soy alumno, quiero registrarme</Link>
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.three, marginBottom: Spacing.two },
  mark: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  headerText: { gap: Spacing.two },
  links: { gap: Spacing.two, marginTop: Spacing.two },
  center: { textAlign: 'center' },
});
