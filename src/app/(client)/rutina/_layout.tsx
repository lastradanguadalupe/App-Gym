import { Stack } from 'expo-router';

import { useI18n } from '@/context/i18n';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

export default function RutinaLayout() {
  const theme = useTheme();
  // El título del header cambia con el idioma.
  useI18n();

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
      <Stack.Screen name="[id]" options={{ headerShown: true, title: t('nav.ejercicio') }} />
    </Stack>
  );
}