import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Screen, Section } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { isUsernameTaken, updateProfilePrefs } from '@/lib/db';
import { t } from '@/i18n';

/**
 * Nombre de usuario, compartido entre el alumno y el profe.
 *
 * A diferencia del nombre, el username es único y tiene formato fijo, así que
 * valida antes de escribir: el error de unique de Postgres no distingue "alias
 * tomado" de otros fallos y el usuario necesita una respuesta clara.
 */
const USERNAME_RE = /^[A-Za-z0-9._]{3,30}$/;

export function UsernameSettings() {
  const { session, profile, refreshProfile } = useSession();
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const uid = session?.user?.id;

  useEffect(() => {
    setUsername(profile?.username ?? '');
  }, [profile?.username]);

  async function handleSave() {
    if (!uid) return;
    setError(null);
    setDone(null);

    const clean = username.trim();
    if (!USERNAME_RE.test(clean)) {
      setError(t('ajustes.usuarioInvalido'));
      return;
    }
    if (clean === profile?.username) return;

    setBusy(true);
    try {
      if (await isUsernameTaken(clean, uid)) {
        setError(t('ajustes.usuarioEnUso'));
        return;
      }
      await updateProfilePrefs(uid, { username: clean });
      await refreshProfile();
      setDone(t('ajustes.usuarioGuardado'));
    } catch (e) {
      console.warn(e);
      setError(t('common.errorGenerico'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Section title={t('ajustes.nombreUsuario')}>
        <Card>
          {!profile?.username ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('ajustes.usuarioSinDefinir')}
            </ThemedText>
          ) : null}

          <Field
            label={t('ajustes.nombreUsuario')}
            value={username}
            onChangeText={setUsername}
            placeholder={t('ajustes.nuevoUsuario')}
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
            label={t('ajustes.guardar')}
            icon="content-save-outline"
            onPress={handleSave}
            loading={busy}
            disabled={username.trim() === (profile?.username ?? '')}
          />
        </Card>
      </Section>
    </Screen>
  );
}
