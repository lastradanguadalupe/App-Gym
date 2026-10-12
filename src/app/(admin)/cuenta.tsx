import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DateField } from '@/components/ui/date-field';
import { Field } from '@/components/ui/field';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { OptionCards, type Option } from '@/components/ui/option-card';
import { Screen, Section } from '@/components/ui/screen';
import { gradientStyle, Gradients, Radius, Shadows, Spacing } from '@/constants/theme';
import { useI18n } from '@/context/i18n';
import { useSession } from '@/context/session';
import { useTheme } from '@/hooks/use-theme';
import { fetchProfeDetails, upsertProfeDetails } from '@/lib/db';
import { computeEdad } from '@/lib/format';
import { t } from '@/i18n';
import { SEXOS, type Sexo } from '@/types';

const EXPERIENCIA_MAX = 60;

function initialsOf(name: string | null | undefined): string {
  return (
    (name ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

const SEXO_LABEL: Record<Sexo, 'ajustes.sexoFemenino' | 'ajustes.sexoMasculino' | 'ajustes.sexoNoDefinido'> = {
  femenino: 'ajustes.sexoFemenino',
  masculino: 'ajustes.sexoMasculino',
  'prefiero no decirlo': 'ajustes.sexoNoDefinido',
};

/**
 * Perfil del profe (`/cuenta`).
 *
 * Su identidad y los datos personales que no son de cuenta (fecha de
 * nacimiento, sexo, años de experiencia). Email, contraseña, nombre y demás
 * viven en Ajustes, que se abre desde acá. Se llama `cuenta` y no `perfil`
 * porque `/perfil` ya es la ruta del alumno (shared routes de Expo Router).
 */
export default function CuentaScreen() {
  const theme = useTheme();
  const { locale } = useI18n();
  const { session, profile, refreshProfile } = useSession();

  const [fechaNacimiento, setFechaNacimiento] = useState<string | null>(null);
  const [sexo, setSexo] = useState<Sexo | null>(null);
  const [experiencia, setExperiencia] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uid = session?.user?.id ?? profile?.id;

  useEffect(() => {
    if (!uid) return;
    let active = true;
    fetchProfeDetails(uid)
      .then((details) => {
        if (!active || !details) return;
        setFechaNacimiento(details.fecha_nacimiento);
        setSexo(details.sexo);
        setExperiencia(details.anios_experiencia != null ? String(details.anios_experiencia) : '');
      })
      .catch((e) => console.warn('[cuenta] error cargando datos', e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [uid]);

  const edad = computeEdad(fechaNacimiento);

  async function handleSave() {
    if (!uid) return;
    setMessage(null);
    setError(null);

    const clean = experiencia.trim();
    let anios: number | null = null;
    if (clean) {
      const parsed = Number(clean);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > EXPERIENCIA_MAX) {
        setError(t('perfil.experienciaInvalida'));
        return;
      }
      anios = parsed;
    }

    setSaving(true);
    try {
      await upsertProfeDetails(uid, {
        fecha_nacimiento: fechaNacimiento,
        sexo,
        anios_experiencia: anios,
      });
      await refreshProfile();
      setMessage(t('perfil.cambiosGuardados'));
    } catch (e) {
      console.warn('[cuenta] error guardando datos', e);
      setError(t('perfil.noSePudieronGuardar'));
    } finally {
      setSaving(false);
    }
  }

  const sexoOptions: Option[] = SEXOS.map((value) => ({
    value,
    label: t(SEXO_LABEL[value]),
  }));

  return (
    <Screen>
      <View style={styles.identity}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.brand },
            gradientStyle(Gradients.accent),
          ]}>
          <ThemedText type="subtitle" themeColor="tintText">
            {initialsOf(profile?.name)}
          </ThemedText>
        </View>
        <View style={styles.identityText}>
          <ThemedText type="display" style={styles.identityName} numberOfLines={1}>
            {profile?.name ?? t('perfil.tuPerfil')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {profile?.email ? `${t('perfil.profe')} · ${profile.email}` : t('perfil.profe')}
          </ThemedText>
        </View>
      </View>

      <Section title={t('perfil.datosPersonales')}>
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {t('perfil.profeSubtitulo')}
          </ThemedText>

          {edad != null ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('perfil.edadAnios', { edad })}
            </ThemedText>
          ) : null}

          <DateField
            label={t('perfil.fechaNacimiento')}
            value={fechaNacimiento}
            onChange={setFechaNacimiento}
            placeholder={t('onboarding.elegirFecha')}
            locale={locale}
          />

          <View style={styles.field}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('ajustes.sexo')}
            </ThemedText>
            <OptionCards
              options={sexoOptions}
              value={sexo}
              onChange={(next) => setSexo(next as Sexo)}
              layout="column"
              accessibilityLabel={t('ajustes.sexo')}
            />
          </View>

          <Field
            label={t('perfil.aniosExperiencia')}
            value={experiencia}
            onChangeText={setExperiencia}
            keyboardType="number-pad"
            placeholder={t('perfil.aniosExperienciaPlaceholder')}
          />

          {message ? <ThemedText themeColor="success">{message}</ThemedText> : null}
          {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}

          <Button
            label={t('common.guardarCambios')}
            icon="content-save-outline"
            onPress={handleSave}
            loading={saving}
            disabled={loading}
          />
        </Card>
      </Section>

      <Section title={t('perfil.ajustesCuenta')}>
        <ListGroup>
          <ListRow
            icon="cog-outline"
            label={t('ajustes.title')}
            onPress={() => router.push('/cuenta/ajustes')}
          />
        </ListGroup>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  identityText: { flex: 1, gap: Spacing.one },
  identityName: { fontSize: 26, lineHeight: 32 },
  field: { gap: Spacing.two },
});
