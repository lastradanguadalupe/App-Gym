import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { OptionCards, type Option } from '@/components/ui/option-card';
import { Screen, Section } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { upsertClientDetails } from '@/lib/db';
import { t } from '@/i18n';
import { SEXOS, type Sexo } from '@/types';

/**
 * Sexo.
 *
 * Opciones cerradas en la base (`SEXOS`), no texto libre: es un dato que el
 * profe lee y que el usuario no debería tener que inventar. Se escribe en
 * `client_details`, que es donde el resto del cuestionario vive.
 */
export default function SexoScreen() {
  const { session, clientDetails, refreshProfile } = useSession();
  const [sexo, setSexo] = useState<Sexo | null>(clientDetails?.sexo ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uid = session?.user?.id;

  useEffect(() => {
    setSexo(clientDetails?.sexo ?? null);
  }, [clientDetails?.sexo]);

  async function handleChange(next: string) {
    if (!uid || busy) return;
    setError(null);
    setBusy(true);
    try {
      await upsertClientDetails(uid, { sexo: next as Sexo });
      setSexo(next as Sexo);
      await refreshProfile();
    } catch (e) {
      console.warn(e);
      setError(t('common.errorGenerico'));
    } finally {
      setBusy(false);
    }
  }

  const options: Option[] = SEXOS.map((value) => ({
    value,
    label:
      value === 'femenino'
        ? t('ajustes.sexoFemenino')
        : value === 'masculino'
          ? t('ajustes.sexoMasculino')
          : t('ajustes.sexoNoDefinido'),
  }));

  return (
    <Screen>
      <Section title={t('ajustes.sexo')}>
        <Card>
          <OptionCards
            options={options}
            value={sexo}
            onChange={handleChange}
            layout="column"
            accessibilityLabel={t('ajustes.sexo')}
          />
          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}
        </Card>
      </Section>
    </Screen>
  );
}