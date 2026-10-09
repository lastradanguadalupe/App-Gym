import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { useSession } from '@/context/session';
import { upsertClientDetails } from '@/lib/db';
import { parseTags } from '@/lib/format';
import { Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import type { Experiencia } from '@/types';

const EXPERIENCIA_VALUES: Experiencia[] = ['inicio', 'intermedio', 'avanzado'];

export default function OnboardingScreen() {
  const { session, refreshProfile } = useSession();
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [altura, setAltura] = useState('');
  const [peso, setPeso] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [enfermedades, setEnfermedades] = useState('');
  const [lesiones, setLesiones] = useState('');
  const [experiencia, setExperiencia] = useState<Experiencia | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const uid = session?.user?.id;
    if (!uid) return;

    if (fechaNacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento.trim())) {
      setError(t('medidas.fechaInvalida'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await upsertClientDetails(uid, {
        fecha_nacimiento: fechaNacimiento.trim() || null,
        altura_cm: altura ? Number(altura) : null,
        peso_kg: peso ? Number(peso) : null,
        objetivo: objetivo.trim() || null,
        enfermedades: parseTags(enfermedades),
        lesiones: parseTags(lesiones),
        experiencia,
      });
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
        <Field
          label={t('perfil.fechaNacimiento')}
          value={fechaNacimiento}
          onChangeText={setFechaNacimiento}
          placeholder={t('common.placeholderIsoEj')}
          autoCapitalize="none"
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <Field
              label={t('onboarding.alturaCm')}
              value={altura}
              onChangeText={setAltura}
              keyboardType="decimal-pad"
              placeholder={t('common.placeholderAltura')}
            />
          </View>
          <View style={styles.half}>
            <Field
              label={t('onboarding.pesoKg')}
              value={peso}
              onChangeText={setPeso}
              keyboardType="decimal-pad"
              placeholder={t('common.placeholderPeso')}
            />
          </View>
        </View>

        <Field
          label={t('perfil.objetivo')}
          value={objetivo}
          onChangeText={setObjetivo}
          placeholder={t('onboarding.objetivoPlaceholder')}
        />

        <Field
          label={t('perfil.enfermedades')}
          value={enfermedades}
          onChangeText={setEnfermedades}
          placeholder={t('onboarding.enfermedadesPlaceholder')}
        />
        <Field
          label={t('perfil.lesiones')}
          value={lesiones}
          onChangeText={setLesiones}
          placeholder={t('onboarding.lesionesPlaceholder')}
        />

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

        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <Button
          label={t('onboarding.guardarYEmpezar')}
          icon="arrow-right"
          onPress={handleSave}
          loading={saving}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.md, paddingTop: Spacing.one },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  half: { flex: 1, minWidth: 120 },
});