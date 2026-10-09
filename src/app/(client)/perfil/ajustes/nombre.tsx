import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Screen, Section } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { updateProfileName } from '@/lib/db';
import { t } from '@/i18n';

/**
 * Nombre de perfil.
 *
 * Distinto del email y del username: el nombre es libre y no tiene que ser
 * único, así que no consulta disponibilidad antes de guardar.
 */
export default function NombreScreen() {
  const { session, profile, refreshProfile } = useSession();
  const [name, setName] = useState(profile?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const uid = session?.user?.id;
  const clean = name.trim();

  async function handleSave() {
    if (!uid) return;
    setError(null);
    setDone(null);

    if (!clean) {
      setError(t('ajustes.nombreVacio'));
      return;
    }
    if (clean === profile?.name) return;

    setBusy(true);
    try {
      await updateProfileName(uid, clean);
      await refreshProfile();
      setDone(t('ajustes.nombreActualizado'));
    } catch (e) {
      console.warn(e);
      setError(t('common.errorGenerico'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Section title={t('ajustes.nombreCompleto')}>
        <Card>
          <Field
            label={t('ajustes.nombreCompleto')}
            value={name}
            onChangeText={setName}
            placeholder={t('ajustes.nuevoNombre')}
            error={error}
          />

          {done ? (
            <ThemedText type="small" themeColor="success">
              {done}
            </ThemedText>
          ) : null}

          <Button
            label={t('common.guardarCambios')}
            icon="content-save-outline"
            onPress={handleSave}
            loading={busy}
            disabled={!clean || clean === (profile?.name ?? '')}
          />
        </Card>
      </Section>
    </Screen>
  );
}