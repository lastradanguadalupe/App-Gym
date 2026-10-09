import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { I18nProvider, useI18n } from '@/context/i18n';
import { SessionProvider, useSession } from '@/context/session';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

SplashScreen.preventAutoHideAsync();

function BootingScreen() {
  const theme = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.brand} />
    </View>
  );
}

function SinPerfilScreen() {
  const theme = useTheme();
  const { refreshProfile, signOut } = useSession();
  // Se suscribe al idioma para que el error también cambie al elegir otro.
  useI18n();
  const [retrying, setRetrying] = useState(false);

  return (
    <ScrollView
      contentContainerStyle={[styles.center, styles.padded, { backgroundColor: theme.background }]}>
      <ThemedText type="display">{t('common.errorCargarPerfil')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        {t('common.reintentarPerfil')}
      </ThemedText>
      <View style={styles.actions}>
        <Button
          label={t('common.reintentar')}
          icon="refresh"
          loading={retrying}
          onPress={async () => {
            setRetrying(true);
            try {
              await refreshProfile();
            } finally {
              setRetrying(false);
            }
          }}
        />
        <Button
          label={t('common.cerrarSesion')}
          variant="secondary"
          icon="logout"
          onPress={() => void signOut()}
        />
      </View>
    </ScrollView>
  );
}

function RootNavigator() {
  const { session, profile, clientDetails, loading, profileLoading } = useSession();

  const isCliente = !!session && profile?.role === 'cliente';
  const isProfe = !!session && profile?.role === 'profe';
  const needsOnboarding = isCliente && !clientDetails;

  /**
   * El splash solo mientras NO hay perfil todavía.
   *
   * `refreshProfile()` pone `profileLoading` en true, y usar ese flag a secas
   * desmontaba el navegador `(client)` entero en cada guardado: al remontar,
   * el stack volvía a su ruta inicial y el usuario caía en la pestaña de Inicio
   * sin haber tocado nada. Un refresco en segundo plano tiene que dejar la UI
   * montada; si el refresco falla, `profile` queda en null y el error se ve
   * igual en `SinPerfilScreen`.
   */
  const booting = loading || (!!session && profileLoading && !profile);

  if (booting) {
    return <BootingScreen />;
  }

  if (session && !isCliente && !isProfe) {
    return <SinPerfilScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={needsOnboarding}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={isCliente && !needsOnboarding}>
        <Stack.Screen name="(client)" />
      </Stack.Protected>
      <Stack.Protected guard={isProfe}>
        <Stack.Screen name="(admin)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const theme = useTheme();
  const navigationTheme = useMemo(
    () => ({
      ...DefaultTheme,
      dark: true,
      colors: {
        ...DefaultTheme.colors,
        primary: theme.brand,
        background: theme.background,
        card: theme.background,
        text: theme.text,
        border: theme.border,
        notification: theme.teal,
      },
    }),
    [theme]
  );

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      <AnimatedSplashOverlay />
      <SessionProvider>
        <I18nProvider>
          <RootNavigator />
        </I18nProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  padded: { padding: Spacing.four, gap: Spacing.two },
  text: { textAlign: 'center' },
  actions: { width: '100%', gap: Spacing.two, marginTop: Spacing.two },
});
