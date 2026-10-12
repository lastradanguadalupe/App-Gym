import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { OptionCards, type Option } from '@/components/ui/option-card';
import { Screen, Section } from '@/components/ui/screen';
import { useI18n } from '@/context/i18n';
import { t } from '@/i18n';
import { IDIOMAS } from '@/types';

/**
 * Idioma de la app, compartido entre el alumno y el profe.
 *
 * `setLocale` del provider aplica el cambio al instante y persiste en
 * `profiles.idioma`; si el guardado falla revierte solo. Por eso esta pantalla
 * no necesita un botón de guardar: elegir la opción ES confirmar.
 *
 * Los nombres de los idiomas van en su propio idioma ("Español" y "English",
 * no traducidos): es la convención de los selectores de idioma.
 */
export function LanguageSettings() {
  const { locale, setLocale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: string) {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await setLocale(next as (typeof IDIOMAS)[number]);
    } catch (e) {
      console.warn(e);
      setError(t('common.errorGenerico'));
    } finally {
      setBusy(false);
    }
  }

  const options: Option[] = IDIOMAS.map((value) => ({
    value,
    label: value === 'es' ? 'Español' : 'English',
  }));

  return (
    <Screen>
      <Section title={t('ajustes.idioma')}>
        <Card>
          <OptionCards
            options={options}
            value={locale}
            onChange={handleChange}
            accessibilityLabel={t('ajustes.idioma')}
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
