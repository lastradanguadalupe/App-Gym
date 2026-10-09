import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/**
 * Stack anidado dentro del tab de Perfil.
 *
 * Los `NativeTabs` no traen header (el que se ve en web viene del mock del
 * `<Tabs />`), así que la pantalla principal declara su propio bloque visual y
 * el resto sí usa un header de verdad: al abrir Ajustes desde el engranaje
 * aparece el título con la flecha de volver, en vez de un modal sin salida
 * visible.
 *
 * `index` es el hub sin header (dibuja su propia cabecera); `datos`, `medidas`
 * y `calendario` son las pantallas con formulario o datos, y todas muestran
 * título y flecha.
 *
 * `ajustes` va con `headerShown: false` a propósito: es un stack anidado con su
 * propio `_layout`, y si el padre también dibuja header se ven DOS barras
 * "Ajustes" apiladas, cada una con su flecha de volver.
 */
export default function PerfilLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.primaryBright,
        headerTitleStyle: { color: theme.text, fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="datos" options={{ title: t('perfil.misDatos') }} />
      <Stack.Screen name="medidas" options={{ title: t('perfil.medidas') }} />
      <Stack.Screen name="calendario" options={{ title: t('perfil.calendario') }} />
      <Stack.Screen name="ajustes" options={{ headerShown: false }} />
    </Stack>
  );
}