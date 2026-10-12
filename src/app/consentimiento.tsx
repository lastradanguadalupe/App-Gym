import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, ButtonRow } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/context/i18n';
import { useSession } from '@/context/session';
import { recordConsent, withdrawHealthConsent } from '@/lib/db';
import { t } from '@/i18n';

/**
 * Pantalla única de re-consentimiento para alumnos que YA tienen enfermedades o
 * lesiones guardadas pero ningún consentimiento registrado (datos cargados
 * antes de esta funcionalidad).
 *
 * Se muestra una sola vez, antes de entrar a la app (ver el guard en
 * `src/app/_layout.tsx`). Aceptar registra el consentimiento y sigue; rechazar
 * borra los datos de salud (con aviso previo) y también deja seguir usando la
 * app. Quien no tiene datos de salud nunca la ve.
 */
export default function ConsentimientoScreen() {
  const { session, refreshProfile } = useSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Se suscribe al idioma para que los textos cambien al elegirlo.
  useI18n();

  async function handleAccept() {
    const uid = session?.user?.id;
    if (!uid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await recordConsent(uid, 'health_data', true);
      await refreshProfile();
    } catch (e) {
      console.warn(e);
      setError(t('consentimiento.errorAceptar'));
      setSaving(false);
    }
  }

  async function handleDecline() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await withdrawHealthConsent();
      await refreshProfile();
    } catch (e) {
      console.warn(e);
      setError(t('consentimiento.errorRetirar'));
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ThemedText type="eyebrow" themeColor="brandBright">
        {t('onboarding.primerPaso')}
      </ThemedText>
      <ThemedText type="display">{t('consentimiento.pantallaTitulo')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('consentimiento.pantallaTexto')}
      </ThemedText>

      <Card>
        <Pressable
          onPress={() => router.push('/privacidad')}
          accessibilityRole="link"
          accessibilityLabel={t('consentimiento.pantallaPrivacidad')}
          hitSlop={8}
          style={({ pressed }) => [pressed && styles.pressed]}>
          <ThemedText type="smallBold" themeColor="brandBright" style={styles.linkText}>
            {t('consentimiento.pantallaPrivacidad')}
          </ThemedText>
        </Pressable>
      </Card>

      {confirmingDelete ? (
        <Card>
          <ThemedText type="smallBold" themeColor="text">
            {t('consentimiento.rechazarTitulo')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('consentimiento.rechazarMensaje')}
          </ThemedText>
          {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
          <ButtonRow>
            <Button
              variant="outline"
              label={t('common.cancelar')}
              onPress={() => setConfirmingDelete(false)}
              disabled={saving}
            />
            <Button
              variant="danger"
              label={t('consentimiento.rechazar')}
              onPress={handleDecline}
              loading={saving}
            />
          </ButtonRow>
        </Card>
      ) : (
        <View style={styles.actions}>
          {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
          <Button
            label={t('consentimiento.aceptar')}
            icon="check"
            onPress={handleAccept}
            loading={saving}
          />
          <Button
            variant="outline"
            label={t('consentimiento.rechazar')}
            onPress={() => {
              setError(null);
              setConfirmingDelete(true);
            }}
            disabled={saving}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: Spacing.two },
  linkText: { textDecorationLine: 'underline' },
  pressed: { opacity: 0.7 },
});
