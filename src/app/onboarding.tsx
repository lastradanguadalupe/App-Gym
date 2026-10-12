import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { HeightField, SexoField, WeightField } from '@/components/ui/body-fields';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { useI18n } from '@/context/i18n';
import { useSession } from '@/context/session';
import { recordConsent, upsertClientDetails, upsertMedida } from '@/lib/db';
import { parseTags } from '@/lib/format';
import { toIsoDate } from '@/lib/calendar';
import { Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import type { Experiencia, Sexo } from '@/types';

const EXPERIENCIA_VALUES: Experiencia[] = ['inicio', 'intermedio', 'avanzado'];

export default function OnboardingScreen() {
  const { locale } = useI18n();
  const { session, refreshProfile } = useSession();
  const [fechaNacimiento, setFechaNacimiento] = useState<string | null>(null);
  const [sexo, setSexo] = useState<Sexo | null>(null);
  const [peso, setPeso] = useState<number | null>(null);
  const [altura, setAltura] = useState<number | null>(null);
  const [objetivo, setObjetivo] = useState('');
  const [enfermedades, setEnfermedades] = useState('');
  const [lesiones, setLesiones] = useState('');
  const [experiencia, setExperiencia] = useState<Experiencia | null>(null);
  // Ninguno de los dos consentimientos viene pre-tildado.
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [healthConsent, setHealthConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Las cuatro preguntas con selector son obligatorias: nada de valores por defecto. */
  const completo =
    fechaNacimiento != null && sexo != null && peso != null && altura != null;

  const enfermedadesTags = parseTags(enfermedades);
  const lesionesTags = parseTags(lesiones);
  const hasHealthInput = enfermedadesTags.length > 0 || lesionesTags.length > 0;

  async function handleSave() {
    const uid = session?.user?.id;
    if (!uid) return;

    if (!fechaNacimiento || !sexo || peso == null || altura == null) {
      setError(t('onboarding.faltanDatos'));
      return;
    }
    if (!acceptedPolicy) {
      setError(t('consentimiento.politicaRequerida'));
      return;
    }
    // Los campos de salud son opcionales: si ambos quedan vacíos no se pide el
    // consentimiento y no se guarda nada de salud.
    if (hasHealthInput && !healthConsent) {
      setError(t('consentimiento.saludRequerido'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // Registro de aceptación general (aplica también a los registros con
      // Google: el onboarding es lo primero que ven).
      await recordConsent(uid, 'privacy_policy', true);
      if (hasHealthInput) {
        await recordConsent(uid, 'health_data', true);
      }

      await upsertClientDetails(uid, {
        fecha_nacimiento: fechaNacimiento,
        sexo,
        peso_kg: peso,
        altura_cm: altura,
        objetivo: objetivo.trim() || null,
        enfermedades: enfermedadesTags,
        lesiones: lesionesTags,
        experiencia,
      });

      // Primera medición con la fecha de hoy (hora local): arranca el gráfico de
      // evolución con el dato del onboarding. Si falla, el cuestionario ya quedó
      // guardado, así que no bloquea el alta.
      try {
        await upsertMedida(uid, {
          fecha: toIsoDate(new Date()),
          peso_kg: peso,
          altura_cm: altura,
        });
      } catch (measureError) {
        console.warn(measureError);
      }

      await refreshProfile();
    } catch (e) {
      setError(t('common.errorGenerico'));
      console.warn(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ThemedText type="eyebrow" themeColor="brandBright">
        {t('onboarding.primerPaso')}
      </ThemedText>
      <ThemedText type="display">{t('onboarding.titulo')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('onboarding.subtitulo')}
      </ThemedText>

      <Card>
        <Checkbox
          checked={acceptedPolicy}
          onChange={setAcceptedPolicy}
          label={t('consentimiento.politicaLabel')}
          linkLabel={t('consentimiento.verPolitica')}
          onLinkPress={() => router.push('/privacidad')}
          testID="policy-checkbox"
        />

        <DateField
          label={t('perfil.fechaNacimiento')}
          value={fechaNacimiento}
          onChange={setFechaNacimiento}
          placeholder={t('onboarding.elegirFecha')}
          locale={locale}
        />

        <SexoField
          label={t('onboarding.sexo')}
          value={sexo}
          onChange={setSexo}
          locale={locale}
        />

        <WeightField
          label={t('onboarding.pesoKg')}
          value={peso}
          onChange={setPeso}
          locale={locale}
        />

        <HeightField
          label={t('onboarding.alturaCm')}
          value={altura}
          onChange={setAltura}
          locale={locale}
        />

        <Field
          label={t('perfil.objetivo')}
          value={objetivo}
          onChangeText={setObjetivo}
          placeholder={t('onboarding.objetivoPlaceholder')}
        />

        <Field
          label={t('onboarding.enfermedades')}
          value={enfermedades}
          onChangeText={setEnfermedades}
          placeholder={t('onboarding.enfermedadesPlaceholder')}
          hint={t('onboarding.enfermedadesHint')}
        />
        <Field
          label={t('onboarding.lesiones')}
          value={lesiones}
          onChangeText={setLesiones}
          placeholder={t('onboarding.lesionesPlaceholder')}
          hint={t('onboarding.lesionesHint')}
        />

        {hasHealthInput ? (
          <Checkbox
            checked={healthConsent}
            onChange={setHealthConsent}
            label={t('consentimiento.saludLabel')}
            linkLabel={t('consentimiento.verPolitica')}
            onLinkPress={() => router.push('/privacidad')}
            testID="health-checkbox"
          />
        ) : null}

        <View style={styles.group}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t('perfil.experiencia')}
          </ThemedText>
          <View style={styles.row}>
            {EXPERIENCIA_VALUES.map((value) => (
              <Chip
                key={value}
                label={t(`experiencia.${value}`)}
                selected={experiencia === value}
                onPress={() => setExperiencia(value)}
              />
            ))}
          </View>
        </View>

        {!completo ? (
          <ThemedText type="small" themeColor="textMuted">
            {t('onboarding.faltanDatos')}
          </ThemedText>
        ) : null}
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <Button
          label={t('onboarding.guardarYEmpezar')}
          icon="arrow-right"
          onPress={handleSave}
          disabled={!completo}
          loading={saving}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.md, paddingTop: Spacing.one },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
});
