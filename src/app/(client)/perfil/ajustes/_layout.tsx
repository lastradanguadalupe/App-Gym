import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/**
 * Stack anidado de Ajustes.
 *
 * Cada fila de la pantalla de Ajustes abre una pantalla con su propio header y
 * su botón de volver. El header se declara explícitamente (no con
 * `headerShown: false`) justamente para que esos títulos y la flecha existan: un
 * `push` a un índice sin título deja al usuario sin forma de volver en Android.
 *
 * Los títulos se resuelven en render porque `t()` lee el idioma activo: como
 * valores de opciones se evalúan en cada montaje, no al importar el módulo.
 */
export default function AjustesLayout() {
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
      <Stack.Screen name="index" options={{ title: t('ajustes.title') }} />
      <Stack.Screen name="email" options={{ title: t('ajustes.email') }} />
      <Stack.Screen name="password" options={{ title: t('ajustes.contrasena') }} />
      <Stack.Screen name="nombre" options={{ title: t('ajustes.nombreCompleto') }} />
      <Stack.Screen name="usuario" options={{ title: t('ajustes.nombreUsuario') }} />
      <Stack.Screen name="sexo" options={{ title: t('ajustes.sexo') }} />
      <Stack.Screen name="idioma" options={{ title: t('ajustes.idioma') }} />
    </Stack>
  );
}