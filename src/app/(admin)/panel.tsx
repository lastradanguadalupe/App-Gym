import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import {
  assignProfe,
  fetchActiveRoutineForClient,
  fetchAlumnos,
  fetchSessions,
  searchClients,
} from '@/lib/db';
import { formatMinutes } from '@/lib/format';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Profile } from '@/types';

type AlumnoStats = { sessions: number; minutes: number; hasRoutine: boolean };

export default function AdminHomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile, signOut } = useSession();

  const [alumnos, setAlumnos] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Record<string, AlumnoStats>>({});
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
      const list = await fetchAlumnos(profile.id);
      setAlumnos(list);
      const entries = await Promise.all(
        list.map(async (a) => {
          const [sessions, routine] = await Promise.all([
            fetchSessions(a.id),
            fetchActiveRoutineForClient(a.id),
          ]);
          return [
            a.id,
            {
              sessions: sessions.length,
              minutes: sessions.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0),
              hasRoutine: !!routine,
            },
          ] as const;
        })
      );
      setStats(Object.fromEntries(entries));
    } catch (e) {
      console.warn('Error cargando alumnos', e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSearch() {
    setMessage(null);
    setError(null);
    if (!query.trim()) {
      setError('Ingresá el nombre (o email) del alumno.');
      return;
    }
    setSearching(true);
    try {
      const matches = await searchClients(query.trim());
      setResults(matches);
      if (!matches.length) {
        setError('No encontré alumnos con ese nombre o email. Deben registrarse primero desde la app.');
      }
    } catch (e) {
      console.warn(e);
      setError('No se pudo buscar. Probá de nuevo.');
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
      setMessage(`${target.name ?? target.email} ahora es tu alumno.`);
      setQuery('');
      setResults([]);
      await load();
    } catch (e) {
      console.warn(e);
      setError('No se pudo asignar. Puede que ya tenga otro profe asignado.');
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
          Panel del profe
        </ThemedText>
        <ThemedText type="display">
          Hola{profile?.name?.split(' ')[0] ? `, ${profile.name.split(' ')[0]}` : ''}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Gestioná tus alumnos, sus rutinas y el contenido motivational.
        </ThemedText>
      </View>

      <Card>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          Agregar un alumno
        </ThemedText>
        <Field
          label="Nombre del alumno"
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setResults([]);
            setError(null);
          }}
          autoCapitalize="words"
          autoComplete="off"
          placeholder="Ej: María González"
          hint="Buscá por nombre y apellido (o email)."
        />
        {message ? <ThemedText themeColor="success">{message}</ThemedText> : null}
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}

        {results.length ? (
          <View style={styles.results}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Resultados ({results.length})
            </ThemedText>
            {results.map((r) => (
              <View key={r.id} style={styles.resultRow}>
                <View style={styles.flex}>
                  <ThemedText type="default">{r.name ?? 'Sin nombre'}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {r.email}
                  </ThemedText>
                </View>
                <Button
                  variant="outline"
                  label="Agregar"
                  icon="account-plus-outline"
                  disabled={busy}
                  onPress={() => handleAssign(r)}
                />
              </View>
            ))}
          </View>
        ) : null}

        <Button
          label="Buscar alumno"
          icon="account-search-outline"
          onPress={handleSearch}
          loading={searching}
        />
      </Card>

      <View style={styles.row}>
        <Button
          variant="secondary"
          label="Catálogo de ejercicios"
          icon="dumbbell"
          onPress={() => router.push('/ejercicios')}
          style={styles.flex}
        />
        <Button
          variant="secondary"
          label="Frases y tips"
          icon="lightbulb-outline"
          onPress={() => router.push('/contenido')}
          style={styles.flex}
        />
      </View>

      {!alumnos.length ? (
        <EmptyState
          icon="account-group-outline"
          title="Todavía no tenés alumnos"
          subtitle="Agregá un alumno por su email para empezar a asignarle una rutina."
        />
      ) : (
        <>
          <ThemedText type="eyebrow" themeColor="textSecondary">
            Tus alumnos ({alumnos.length})
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
                        ? `${st.sessions} entrenamientos · ${formatMinutes(st.minutes)} · ${
                            st.hasRoutine ? 'con rutina' : 'sin rutina'
                          }`
                        : 'Cargando...'}
                    </ThemedText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={theme.brandBright} />
                </Card>
              </Pressable>
            );
          })}
        </>
      )}

      <Button variant="danger" label="Cerrar sesión" icon="logout" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.five },
  row: { flexDirection: 'row', gap: Spacing.two },
  alumnoCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  results: { gap: Spacing.two },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1C3E6B',
  },
});