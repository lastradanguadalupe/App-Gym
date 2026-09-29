import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/context/session';
import { useTheme } from '@/hooks/use-theme';

export default function AdminLayout() {
  const theme = useTheme();
  const { profile } = useSession();

  // Guarda de rol: aunque alguien entre por deep link a /panel, /alumno, etc.
  if (profile?.role !== 'profe') {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text, fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="panel" options={{ title: 'Mis alumnos' }} />
      <Stack.Screen name="alumno/[id]" options={{ title: 'Alumno' }} />
      <Stack.Screen name="ejercicios" options={{ title: 'Ejercicios' }} />
      <Stack.Screen name="contenido" options={{ title: 'Contenido' }} />
    </Stack>
  );
}
