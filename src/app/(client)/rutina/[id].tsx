import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { fetchActiveRoutineForClient, fetchExercise } from '@/lib/db';
import { regionLabel } from '@/lib/format';
import { compactSummary } from '@/lib/routine-params';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/context/i18n';
import { t } from '@/i18n';
import type { Exercise, Region, RoutineBlockExercise } from '@/types';

export default function ExerciseDetailScreen() {
  const params = useLocalSearchParams<{ id: string; blockId?: string }>();
  const { session } = useSession();
  const theme = useTheme();
  const { locale } = useI18n();

  const [exercise, setExercise] = useState<(Exercise & { muscle_groups?: { name: string; region: Region } }) | null>(null);
  const [context, setContext] = useState<{
    blockName: string | null;
    rbe: Pick<RoutineBlockExercise, 'sets' | 'reps' | 'rest_seconds' | 'peso_kg'>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const id = Number(params.id);
        const [ex, activeRoutine] = await Promise.all([
          fetchExercise(id),
          params.blockId ? fetchActiveRoutineForClient(session?.user?.id ?? '') : null,
        ]);
        if (!active) return;
        setExercise(ex);
        if (activeRoutine && params.blockId) {
          const block = activeRoutine.routine_blocks.find((b) => b.id === Number(params.blockId));
          const rbe = block?.routine_block_exercises.find((x) => x.exercise_id === id);
          if (rbe) {
            setContext({
              blockName: block?.name ?? null,
              rbe: {
                sets: rbe.sets,
                reps: rbe.reps,
                rest_seconds: rbe.rest_seconds,
                peso_kg: rbe.peso_kg,
              },
            });
          }
        }
      } catch (e) {
        console.warn('Error cargando ejercicio', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.id, params.blockId, session?.user?.id]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={theme.brandBright} style={styles.loader} />
      </Screen>
    );
  }

  if (!exercise) {
    return (
      <Screen>
        <ThemedText type="display">{t('rutina.noEncontrado')}</ThemedText>
      </Screen>
    );
  }

  const muscle = exercise.muscle_groups;

  return (
    <Screen>
      <Stack.Screen options={{ title: exercise.name }} />

      {exercise.image_url ? (
        <Image
          source={{ uri: exercise.image_url }}
          style={styles.image}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[styles.image, { backgroundColor: theme.backgroundElement }]}>
          <SymbolView tintColor={theme.textSecondary} name="dumbbell" size={48} />
          <ThemedText type="small" themeColor="textSecondary">
            {t('rutina.fotoPendiente', { region: muscle?.name ?? '' })}
          </ThemedText>
        </View>
      )}

      <View style={styles.chipsRow}>
        {muscle ? <Chip label={muscle.name} selected /> : null}
        {muscle ? <Chip label={regionLabel(locale, muscle.region)} /> : null}
      </View>

      {context ? (
        <Card tone="brand">
          <ThemedText type="eyebrow" themeColor="brandBright">
            {t('rutina.parametrosEnRutina')}
          </ThemedText>
          <ThemedText type="default" themeColor="text">
            {`${context.blockName ?? t('rutina.bloqueGenerico')} · ${compactSummary(locale, context.rbe)}`}
          </ThemedText>
        </Card>
      ) : null}

      <Card>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          {t('rutina.comoHacerlo')}
        </ThemedText>
        <ThemedText type="default">
          {exercise.instructions ?? t('rutina.sinInstrucciones')}
        </ThemedText>
      </Card>

      {exercise.video_url ? (
        <Pressable onPress={() => Linking.openURL(exercise.video_url!)}>
          <Card style={styles.videoCard} tone="brand">
            <View style={styles.videoRow}>
              <MaterialCommunityIcons name="play-circle-outline" size={22} color={theme.brandBright} />
              <ThemedText type="smallBold" themeColor="brandBright">
                {t('rutina.verVideo')}
              </ThemedText>
            </View>
          </Card>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.five },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  chipsRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  videoCard: { alignItems: 'center' },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});