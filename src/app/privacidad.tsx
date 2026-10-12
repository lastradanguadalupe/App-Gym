import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/context/i18n';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { PRIVACY_POLICY_VERSION } from '@/lib/legal';
import type { TranslationKey } from '@/i18n';

/**
 * Política de Privacidad — pantalla PÚBLICA (`/privacidad`).
 *
 * Se puede abrir sin iniciar sesión (también en web), desde el checkbox del
 * onboarding y desde Ajustes. El texto es un borrador con placeholders
 * [COMPLETAR] (ver docs/LEGAL_PENDIENTE.md). El idioma sigue el de la app; si no
 * hay sesión arranca en español y se puede cambiar con el selector de arriba.
 */

const SECCIONES: { titulo: TranslationKey; texto: TranslationKey }[] = [
  { titulo: 'privacidad.s1Titulo', texto: 'privacidad.s1Texto' },
  { titulo: 'privacidad.s2Titulo', texto: 'privacidad.s2Texto' },
  { titulo: 'privacidad.s3Titulo', texto: 'privacidad.s3Texto' },
  { titulo: 'privacidad.s4Titulo', texto: 'privacidad.s4Texto' },
  { titulo: 'privacidad.s5Titulo', texto: 'privacidad.s5Texto' },
  { titulo: 'privacidad.s6Titulo', texto: 'privacidad.s6Texto' },
  { titulo: 'privacidad.s7Titulo', texto: 'privacidad.s7Texto' },
  { titulo: 'privacidad.s8Titulo', texto: 'privacidad.s8Texto' },
  { titulo: 'privacidad.s9Titulo', texto: 'privacidad.s9Texto' },
];

export default function PrivacidadScreen() {
  const theme = useTheme();
  const { locale, setLocale } = useI18n();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t('privacidad.volver')}
          hitSlop={10}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textSecondary} />
        </Pressable>
        <ThemedText type="display" style={styles.headerTitle}>
          {t('privacidad.titulo')}
        </ThemedText>
      </View>

      <View style={styles.langs}>
        <Chip
          label={t('privacidad.idiomaEs')}
          selected={locale === 'es'}
          onPress={() => void setLocale('es')}
        />
        <Chip
          label={t('privacidad.idiomaEn')}
          selected={locale === 'en'}
          onPress={() => void setLocale('en')}
        />
      </View>

      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          {t('privacidad.borrador')}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted">
          {t('privacidad.version', { version: PRIVACY_POLICY_VERSION })}
        </ThemedText>
      </Card>

      {SECCIONES.map((seccion) => (
        <Card key={seccion.titulo}>
          <ThemedText type="smallBold" themeColor="text">
            {t(seccion.titulo)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t(seccion.texto)}
          </ThemedText>
        </Card>
      ))}

      <Card>
        <ThemedText type="small" themeColor="textMuted">
          {t('privacidad.registro')}
        </ThemedText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, flexShrink: 1, minWidth: 0 },
  langs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  pressed: { opacity: 0.7 },
});
