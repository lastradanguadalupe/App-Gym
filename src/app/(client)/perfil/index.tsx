import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Field } from '@/components/ui/field';
import { IconAction } from '@/components/ui/icon-action';
import { Screen, Section } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { fetchProfile, updateProfileName, upsertClientDetails } from '@/lib/db';
import { computeEdad, parseTags } from '@/lib/format';
import { gradientStyle, Gradients, Spacing, Radius, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import type { Experiencia, Profile } from '@/types';

/**
 * El rótulo de cada nivel se resuelve en render, no en un array de constantes:
 * `t()` lee el idioma activo, y un `const` de módulo se calcularía una sola vez
 * con el idioma del primer mount.
 */
function experienciaLabel(value: Experiencia): string {
  switch (value) {
    case 'inicio':
      return t('perfil.expPrincipiante');
    case 'intermedio':
      return t('perfil.expIntermedio');
    case 'avanzado':
      return t('perfil.expAvanzado');
  }
}

export default function PerfilScreen() {
  const theme = useTheme();
  const { session, profile, clientDetails, refreshProfile } = useSession();

  const [name, setName] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [altura, setAltura] = useState('');
  const [peso, setPeso] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [enfermedades, setEnfermedades] = useState('');
  const [lesiones, setLesiones] = useState('');
  const [experiencia, setExperiencia] = useState<Experiencia | null>(null);
  const [profe, setProfe] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? '');
    if (profile.profe_id) {
      fetchProfile(profile.profe_id)
        .then(setProfe)
        .catch(() => setProfe(null));
    }
  }, [profile]);

  useEffect(() => {
    if (!clientDetails) return;
    setFechaNacimiento(clientDetails.fecha_nacimiento ?? '');
    setAltura(clientDetails.altura_cm != null ? String(clientDetails.altura_cm) : '');
    setPeso(clientDetails.peso_kg != null ? String(clientDetails.peso_kg) : '');
    setObjetivo(clientDetails.objetivo ?? '');
    setEnfermedades((clientDetails.enfermedades ?? []).join(', '));
    setLesiones((clientDetails.lesiones ?? []).join(', '));
    setExperiencia(clientDetails.experiencia);
  }, [clientDetails]);

  const uid = session?.user?.id;
  const edad = computeEdad(clientDetails?.fecha_nacimiento ?? null);
  const initials =
    (profile?.name ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?';

  async function handleSave() {
    if (!uid) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      if (name.trim() && name.trim() !== profile?.name) {
        await updateProfileName(uid, name.trim());
      }
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
      setMessage(t('perfil.cambiosGuardados'));
    } catch (e) {
      setError(t('perfil.noSePudieronGuardar'));
      console.warn(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      {/* Los NativeTabs no traen header, así que este bloque hace de cabecera de
          la pantalla y el engranaje vive acá: es el mismo lugar en native y web. */}
      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: theme.brand }, gradientStyle(Gradients.accent)]}>
          <ThemedText type="subtitle" themeColor="tintText">
            {initials}
          </ThemedText>
        </View>
        <View style={styles.identityText}>
          <ThemedText type="display" style={styles.identityName}>
            {profile?.name ?? t('perfil.tuPerfil')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {profile?.role === 'profe' ? t('perfil.profe') : t('perfil.alumno')}
            {profile?.email ? ` · ${profile.email}` : ''}
          </ThemedText>
        </View>
        <IconAction
          icon="cog-outline"
          label={t('ajustes.title')}
          color={theme.textSecondary}
          background={theme.backgroundElement}
          onPress={() => router.push('/perfil/ajustes')}
        />
      </View>

      <Section title={t('perfil.datosCuenta')}>
        <Card>
          <Field label={t('perfil.nombre')} value={name} onChangeText={setName} />
          {profe ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('perfil.tuProfe')}: <ThemedText type="smallBold">{profe.name ?? profe.email}</ThemedText>
            </ThemedText>
          ) : null}
        </Card>
      </Section>

      <Section title={t('perfil.informacionRutina')}>
        <Card>
          {edad != null ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('perfil.edadAnios', { edad })} · {clientDetails?.altura_cm ?? '—'} cm ·{' '}
              {clientDetails?.peso_kg ?? '—'} kg
            </ThemedText>
          ) : null}

          <Field
            label={t('perfil.fechaNacimiento')}
            value={fechaNacimiento}
            onChangeText={setFechaNacimiento}
            placeholder="AAAA-MM-DD"
            autoCapitalize="none"
          />
          <View style={styles.row}>
            <View style={styles.half}>
              <Field
                label={`${t('perfil.altura')} (cm)`}
                value={altura}
                onChangeText={setAltura}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.half}>
              <Field
                label={`${t('perfil.peso')} (kg)`}
                value={peso}
                onChangeText={setPeso}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <Field label={t('perfil.objetivo')} value={objetivo} onChangeText={setObjetivo} />
          <Field
            label={t('perfil.enfermedades')}
            value={enfermedades}
            onChangeText={setEnfermedades}
          />
          <Field label={t('perfil.lesiones')} value={lesiones} onChangeText={setLesiones} />

          <View style={styles.group}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('perfil.experiencia')}
            </ThemedText>
            <View style={styles.row}>
              {(['inicio', 'intermedio', 'avanzado'] as const).map((exp) => (
                <Chip
                  key={exp}
                  label={experienciaLabel(exp)}
                  selected={experiencia === exp}
                  onPress={() => setExperiencia(exp)}
                />
              ))}
            </View>
          </View>

          {message ? <ThemedText themeColor="success">{message}</ThemedText> : null}
          {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
          <Button
            label={t('common.guardarCambios')}
            icon="content-save-outline"
            onPress={handleSave}
            loading={saving}
          />
        </Card>
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
  group: { gap: Spacing.md, paddingTop: Spacing.one },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  half: { flex: 1, minWidth: 120 },
});