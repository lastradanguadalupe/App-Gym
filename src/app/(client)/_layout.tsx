import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { ShadowColor } from '@/constants/theme';
import { useI18n } from '@/context/i18n';
import { useSession } from '@/context/session';
import { WorkoutProvider } from '@/context/workout';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

export default function ClientLayout() {
  const theme = useTheme();
  const { profile } = useSession();
  // Las etiquetas de las pestañas cambian con el idioma elegido.
  useI18n();

  // Un profe no tiene tabs de alumno: lo mandamos a su panel.
  if (profile?.role === 'profe') {
    return <Redirect href="/panel" />;
  }

  return (
    <WorkoutProvider>
      <NativeTabs
        backgroundColor={theme.background}
        tintColor={theme.brand}
        iconColor={theme.textSecondary}
        indicatorColor={theme.brand}
        rippleColor={theme.brandSurfaceAlt}
        shadowColor={ShadowColor}
        disableTransparentOnScrollEdge
        tabBarRespectsIMEInsets
        labelStyle={{
          selected: { color: theme.brand, fontWeight: '700' },
          default: { color: theme.textSecondary, fontWeight: '600' },
        }}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>{t('nav.inicio')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="rutina">
          <NativeTabs.Trigger.Label>{t('nav.rutina')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'dumbbell', selected: 'dumbbell.fill' }} md="fitness_center" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="historial">
          <NativeTabs.Trigger.Label>{t('nav.historial')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'clock', selected: 'clock.fill' }} md="history" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="perfil">
          <NativeTabs.Trigger.Label>{t('nav.perfil')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </WorkoutProvider>
  );
}
