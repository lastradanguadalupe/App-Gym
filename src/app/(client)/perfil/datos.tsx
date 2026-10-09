import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Field } from '@/components/ui/field';
import { Screen, Section } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/context/session';
import { fetchProfile, upsertClientDetails } from '@/lib/db';
import { computeEdad, parseTags } from '@/lib/format';
import { t } from '@/i18n';
import type { Experiencia, Profile } from '@/types';

/**
 * Cuestionario de la rutina.
 *
 * Solo lo que el profe necesita para armar el plan. El nombre, el username y
 * las preferencias de cuenta viven en Ajustes: acá el foco es uno y el botón de
 * guardar es el de esta pantalla.
 *
 * El rótulo de cada nivel se resuelve en render, no en un array de constantes:
 * `t()` lee el idioma activo, y un `const` de módulo se calcularía una sola vez
 * con el idioma del primer mount.
 */
function experienciaLabel(value: Experiencia): string {
  switch (value) {
    case 'inicio':
      return t('experiencia.inicio');
    case 'intermedio':
      return t('experiencia.intermedio');
    case 'avanzado':
      return t('experiencia.avanzado');
  }
}

export default function MisDatosScreen() {
  const { session, profile, clientDetails, refreshProfile } = useSession();

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
    if (!profile?.profe_id) {
      setProfe(null);
      return;
    }
    let active = true;
    fetchProfile(profile.profe_id)
      .then((next) => {
        if (active) setProfe(next);
      })
      .catch(() => {
        if (active) setProfe(null);
      });
    return () => {
      active = false;
    };
  }, [profile?.profe_id]);

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

  async function handleSave() {
    if (!uid) return;
    setSaving(true);
    setMessage(null);
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
      {profe ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('perfil.tuProfe')}:{' '}
          <ThemedText type="smallBold">{profe.name ?? profe.email}</ThemedText>
        </ThemedText>
      ) : null}

      <Section title={t('perfil.informacionRutina')}>
        <Card>
          {edad != null ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('perfil.edadAnios', { edad })}
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
                label={`${t('perfil.altura')} (${t('perfil.cm')})`}
                value={altura}
                onChangeText={setAltura}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.half}>
              <Field
                label={`${t('perfil.peso')} (${t('perfil.kg')})`}
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
  group: { gap: Spacing.md, paddingTop: Spacing.one },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  half: { flex: 1, minWidth: 120 },
});