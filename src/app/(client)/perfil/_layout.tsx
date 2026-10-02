import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/**
 * Stack anidado dentro del tab de Perfil.
 *
 * Los `NativeTabs` no traen header (el que se ve en web viene del mock del
 * `<Tabs />`), así que la pantalla principal declara su propio bloque visual y
 * esta pantalla sí usa un header de verdad: al abrir Ajustes desde el engranaje
 * aparece el título con la flecha de volver, en vez de un modal sin salida
 * visible.
 */
export default function PerfilLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.brandBright,
        headerTitleStyle: { color: theme.text, fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="ajustes" options={{ title: t('ajustes.title') }} />
    </Stack>
  );
}