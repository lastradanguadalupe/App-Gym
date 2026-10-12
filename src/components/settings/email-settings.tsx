import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Screen, Section } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { accountInfo, requestEmailChange } from '@/lib/auth-account';
import { AUTH_ERROR_KEY } from '@/i18n/auth-errors';
import { t } from '@/i18n';

/**
 * Cambio de email, compartido entre el alumno y el profe.
 *
 * Supabase no cambia el email en el acto: manda un correo de confirmación al
 * destino nuevo. Por eso la confirmación dice "te enviamos el correo" y no
 * "cambiaste tu email" — el valor viejo sigue siendo el activo hasta que el
 * enlace se abre.
 */
export function EmailSettings() {
  const { session } = useSession();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const user = session?.user ?? null;
  const info = user ? accountInfo(user) : null;

  async function handleChange() {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const result = await requestEmailChange(email);
      if (result.ok) {
        setDone(t('ajustes.emailEnviado', { email: email.trim() }));
        setEmail('');
      } else {
        setError(t(AUTH_ERROR_KEY[result.code]));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Section title={t('ajustes.email')}>
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {t('ajustes.correoActual', { email: info?.email ?? '—' })}
          </ThemedText>

          <Field
            label={t('ajustes.nuevoEmail')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={error}
          />

          {done ? (
            <ThemedText type="small" themeColor="success">
              {done}
            </ThemedText>
          ) : null}

          <Button
            label={t('ajustes.cambiarEmail')}
            icon="email-edit-outline"
            variant="outline"
            onPress={handleChange}
            loading={busy}
            disabled={!email.trim()}
          />
        </Card>
      </Section>
    </Screen>
  );
}
