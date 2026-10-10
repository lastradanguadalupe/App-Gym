import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, ButtonRow } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import {
  assignProfe,
  countAlumnos,
  fetchAlumnos,
  fetchStudentStats,
  searchClients,
  type AlumnoStats,
} from '@/lib/db';
import { formatMinutes } from '@/lib/format';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/context/i18n';
import { t } from '@/i18n';
import type { Profile } from '@/types';

const PAGE_SIZE = 20;

export default function AdminHomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile, signOut } = useSession();
  const { locale } = useI18n();

  const [alumnos, setAlumnos] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Record<string, AlumnoStats>>({});
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Pick<Profile, 'id' | 'email' | 'name'>[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    try {
      // Stats de todos los alumnos en una consulta, no uno por alumno.
      const [list, totals] = await Promise.all([
        fetchAlumnos(profile.id, page, PAGE_SIZE),
        fetchStudentStats(profile.id),
      ]);
      setAlumnos(list);
      setStats(totals);
      setTotal(await countAlumnos(profile.id));
    } catch (e) {
      console.warn('Error cargando alumnos', e);
    } finally {
      setLoading(false);
    }
  }, [profile, page]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function goToPage(next: number) {
    setLoading(true);
    setPage(Math.min(Math.max(0, next), pages - 1));
  }

  async function handleSearch() {
    setMessage(null);
    setError(null);
    if (!query.trim()) {
      setError(t('admin.buscarSinNombre'));
      return;
    }
    setSearching(true);
    try {
      const matches = await searchClients(query.trim());
      setResults(matches);
      if (!matches.length) {
        setError(t('admin.buscarSinResultados'));
      }
    } catch (e) {
      console.warn(e);
      setError(t('admin.buscarError'));
    } finally {
      setSearching(false);
    }
  }

  async function handleAssign(target: Pick<Profile, 'id' | 'email' | 'name'>) {
    setMessage(null);
    setError(null);
    setBusy(true);
    try {
      await assignProfe(target.id);
      setMessage(t('admin.alumnoAsignado', { nombre: target.name ?? target.email }));
      setQuery('');
      setResults([]);
      await load();
    } catch (e) {
      console.warn(e);
      setError(t('admin.asignarError'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={theme.brandBright} style={styles.loader} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View>
        <ThemedText type="small" themeColor="text">
          {t('admin.panelProfe')}
        </ThemedText>
        <ThemedText type="display">
          {t('inicio.holaNombre', { nombre: profile?.name?.split(' ')[0] ?? '' })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('admin.panelSubtitulo')}
        </ThemedText>
      </View>

      <Card>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          {t('admin.agregarAlumno')}
        </ThemedText>
        <Field
          label={t('admin.nombreAlumno')}
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setResults([]);
            setError(null);
          }}
          autoCapitalize="words"
          autoComplete="off"
          placeholder={t('common.placeholderNombre')}
          hint={t('admin.buscarHint')}
        />
        {message ? <ThemedText themeColor="success">{message}</ThemedText> : null}
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}

        {results.length ? (
          <View style={styles.results}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('admin.resultados', { count: results.length })}
            </ThemedText>
            {results.map((r) => (
              <View key={r.id} style={styles.resultRow}>
                <View style={styles.flex}>
                  <ThemedText type="default">{r.name ?? t('admin.sinNombre')}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {r.email}
                  </ThemedText>
                </View>
                <Button
                  variant="outline"
                  label={t('common.agregar')}
                  icon="account-plus-outline"
                  disabled={busy}
                  onPress={() => handleAssign(r)}
                />
              </View>
            ))}
          </View>
        ) : null}

        <Button
          label={t('admin.buscarAlumno')}
          icon="account-search-outline"
          onPress={handleSearch}
          loading={searching}
        />
      </Card>

      <ButtonRow>
        <Button
          variant="secondary"
          label={t('admin.catalogoEjercicios')}
          icon="dumbbell"
          onPress={() => router.push('/ejercicios')}
          style={styles.flex}
        />
        <Button
          variant="secondary"
          label={t('admin.frasesYTips')}
          icon="lightbulb-outline"
          onPress={() => router.push('/contenido')}
          style={styles.flex}
        />
      </ButtonRow>

      {!total ? (
        <EmptyState
          icon="account-group-outline"
          title={t('admin.sinAlumnos')}
          subtitle={t('admin.sinAlumnosSubtitulo')}
        />
      ) : (
        <>
          <ThemedText type="eyebrow" themeColor="textSecondary">
            {t('admin.tusAlumnos', { total })}
          </ThemedText>
          {alumnos.map((a) => {
            const st = stats[a.id];
            return (
              <Pressable
                key={a.id}
                onPress={() => router.push(`/alumno/${a.id}`)}
                style={({ pressed }) => pressed && styles.pressed}>
                <Card style={styles.alumnoCard}>
                  <View style={styles.flex}>
                    <ThemedText type="smallBold">{a.name ?? a.email}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {st
                        ? `${t('admin.alumnoResumen', {
                            sesiones: st.sessions,
                            minutos: formatMinutes(locale, st.minutes),
                            rutina: st.hasRoutine
                              ? t('admin.conRutina')
                              : t('admin.sinRutina'),
                          })}`
                        : t('admin.sinDatos')}
                    </ThemedText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={theme.brandBright} />
                </Card>
              </Pressable>
            );
          })}

          {pages > 1 ? (
            <ButtonRow>
              <Button
                variant="secondary"
                label={t('common.anterior')}
                icon="chevron-left"
                disabled={page === 0}
                onPress={() => goToPage(page - 1)}
                style={styles.flex}
              />
              <ThemedText type="small" themeColor="textSecondary" style={styles.pagerText}>
                {page + 1} / {pages}
              </ThemedText>
              <Button
                variant="secondary"
                label={t('common.siguiente')}
                icon="chevron-right"
                disabled={page >= pages - 1}
                onPress={() => goToPage(page + 1)}
                style={styles.flex}
              />
            </ButtonRow>
          ) : null}
        </>
      )}

      <Button
        variant="danger"
        label={t('common.cerrarSesion')}
        icon="logout"
        onPress={signOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.five },
  pagerText: { textAlign: 'center' },
  alumnoCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  results: { gap: Spacing.two },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.border,
  },
});