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
  searchClientsStatus,
  type AlumnoStats,
  type ClientSearchResult,
} from '@/lib/db';
import { friendlyError } from '@/lib/errors';
import {
  isEmailQuery,
  MIN_SEARCH_CHARS,
  searchOutcome,
  type ClientSearchStatus,
} from '@/lib/admin-search';
import { formatMinutes } from '@/lib/format';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/context/i18n';
import { t } from '@/i18n';
import type { Profile } from '@/types';

const PAGE_SIZE = 20;

/** Traduce la situación de la búsqueda al mensaje (o null si hay resultados). */
function outcomeMessage(outcome: ReturnType<typeof searchOutcome>): string | null {
  switch (outcome) {
    case 'minimum':
      return t('admin.buscarMinimo');
    case 'otherProfe':
      return t('admin.buscarOtroProfe');
    case 'emptyEmail':
      return t('admin.buscarSinResultadosEmail');
    case 'emptyName':
      return t('admin.buscarSinResultados');
    case 'results':
      return null;
  }
}

/**
 * Listado y alta de alumnos.
 *
 * Antes vivía en el Panel; con el dashboard en `/panel`, esta es su pantalla
 * propia. El marco (sidebar) ya no ofrece catálogo/frases ni cerrar sesión acá:
 * eso vive en la navegación.
 */
export default function AlumnosScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useSession();
  const { locale } = useI18n();

  const [alumnos, setAlumnos] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Record<string, AlumnoStats>>({});
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientSearchResult[]>([]);
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
    const trimmed = query.trim();
    if (!trimmed) {
      setError(t('admin.buscarSinNombre'));
      return;
    }
    if (trimmed.length < MIN_SEARCH_CHARS) {
      setError(t('admin.buscarMinimo'));
      return;
    }
    setSearching(true);
    try {
      const matches = await searchClients(trimmed);
      setResults(matches);
      // El estado puntual por email solo se consulta si no hubo resultados,
      // así distinguimos "no existe" de "ya tiene otro profe".
      let status: ClientSearchStatus | null = null;
      if (!matches.length && isEmailQuery(trimmed)) {
        status = await searchClientsStatus(trimmed);
      }
      setError(outcomeMessage(searchOutcome(trimmed, matches.length, status)));
    } catch (e) {
      console.warn('[alumnos] error buscando alumnos', e);
      setError(t('admin.buscarError'));
    } finally {
      setSearching(false);
    }
  }

  async function handleAssign(target: ClientSearchResult) {
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
      console.warn('[alumnos] error asignando alumno', e);
      setError(friendlyError(e, 'admin.asignarError'));
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
      <Card>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          {t('admin.agregarAlumno')}
        </ThemedText>

        <Field
          label={t('admin.nombreAlumno')}
          value={query}
          onChangeText={setQuery}
          placeholder={t('common.placeholderNombre')}
          hint={t('admin.buscarHint')}
        />

        <Button
          label={t('admin.buscarAlumno')}
          icon="account-search-outline"
          onPress={handleSearch}
          loading={searching}
        />

        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        {message ? <ThemedText themeColor="success">{message}</ThemedText> : null}

        {results.length ? (
          <View style={styles.results}>
            <ThemedText type="small" themeColor="textSecondary">
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
                {r.is_mine ? (
                  <ThemedText type="small" themeColor="success">
                    {t('admin.yaEsTuAlumno')}
                  </ThemedText>
                ) : (
                  <Button
                    variant="outline"
                    label={t('common.agregar')}
                    icon="account-plus-outline"
                    disabled={busy}
                    onPress={() => handleAssign(r)}
                  />
                )}
              </View>
            ))}
          </View>
        ) : null}
      </Card>

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
