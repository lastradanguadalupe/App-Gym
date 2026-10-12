import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card, StatCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/context/i18n';
import { useSession } from '@/context/session';
import { useTheme } from '@/hooks/use-theme';
import { fetchProfeDashboard, type AttentionStudent, type RecentActivity } from '@/lib/db';
import { startOfWeekMonday } from '@/lib/calendar';
import { formatMinutes, formatRelativeTime } from '@/lib/format';
import { t } from '@/i18n';
import type { Idioma } from '@/types';

/** Etiqueta de "necesita atención", con singular para el día 1. */
function attentionLabel(student: AttentionStudent): string {
  switch (student.reason) {
    case 'no_routine':
      return t('admin.atencionSinRutina');
    case 'inactive':
      return student.days === 1
        ? t('admin.atencionInactivoUna')
        : t('admin.atencionInactivo', { count: student.days });
    case 'stale':
      return student.days === 1
        ? t('admin.atencionRutinaViejaUna')
        : t('admin.atencionRutinaVieja', { count: student.days });
  }
}

/**
 * Dashboard del profe.
 *
 * Deja de ser "la lista de alumnos": ahora responde, de un vistazo, qué hacer
 * primero (seguir donde quedamos o armar la primera rutina), quién necesita
 * atención y qué pasó esta semana. La lista y el alta viven en `/alumnos`.
 */
export default function PanelScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useSession();
  const { locale } = useI18n();

  const [dashboard, setDashboard] = useState<Awaited<
    ReturnType<typeof fetchProfeDashboard>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    try {
      // El rango se calcula en hora local y se manda a la RPC: el servidor no
      // tiene que adivinar el huso del usuario.
      const start = startOfWeekMonday(new Date());
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      setDashboard(
        await fetchProfeDashboard({ weekStart: start.toISOString(), weekEnd: end.toISOString() })
      );
      setError(false);
    } catch (e) {
      console.warn('[panel] error cargando dashboard', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={theme.brandBright} style={styles.loader} />
      </Screen>
    );
  }

  if (error || !dashboard) {
    return (
      <Screen>
        <EmptyState
          icon="cloud-off-outline"
          title={t('common.errorGenerico')}
          subtitle={t('admin.dashboardSubtitulo')}
        />
      </Screen>
    );
  }

  const { continue: continueRoutine, first_student, attention, attention_total, activity, week } =
    dashboard;

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
          {t('admin.dashboardSubtitulo')}
        </ThemedText>
      </View>

      {/* Seguir donde quedamos: la última rutina editada, o el arranque en frío. */}
      {continueRoutine ? (
        <Card tone="brand">
          <ThemedText type="eyebrow" themeColor="textSecondary">
            {t('admin.seguirTitulo')}
          </ThemedText>
          <ThemedText type="title" numberOfLines={2}>
            {continueRoutine.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {continueRoutine.client_name} · {formatRelativeTime(locale, continueRoutine.updated_at)}
          </ThemedText>
          <Button
            label={t('admin.seguirCta')}
            icon="arrow-right"
            onPress={() => router.push(`/alumno/${continueRoutine.client_id}`)}
          />
        </Card>
      ) : first_student ? (
        <Card tone="brand">
          <ThemedText type="eyebrow" themeColor="textSecondary">
            {t('admin.primerAlumnoTitulo')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('admin.primerAlumnoTexto', { nombre: first_student.name })}
          </ThemedText>
          <Button
            label={t('admin.primerAlumnoCta')}
            icon="plus"
            onPress={() => router.push(`/alumno/${first_student.client_id}`)}
          />
        </Card>
      ) : (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {t('admin.seguirSinRutina')}
          </ThemedText>
        </Card>
      )}

      {/* Esta semana */}
      <SectionWrapper title={t('admin.semanaTitulo')}>
        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <StatCard
              icon="dumbbell"
              value={String(week.completed)}
              label={t('admin.statEntrenamientos')}
            />
          </View>
          <View style={styles.statCell}>
            <StatCard
              icon="account-check-outline"
              value={String(week.active)}
              label={t('admin.statAlumnosActivos')}
            />
          </View>
          <View style={styles.statCell}>
            <StatCard
              icon="account-group-outline"
              value={String(week.total)}
              label={t('admin.statAlumnos')}
            />
          </View>
          <View style={styles.statCell}>
            <StatCard
              icon="clipboard-alert-outline"
              value={String(week.without_routine)}
              label={t('admin.statSinRutina')}
            />
          </View>
        </View>
      </SectionWrapper>

      {/* Alumnos que necesitan atención */}
      <SectionWrapper
        title={
          attention_total > 0
            ? t('admin.atencionTotal', { count: attention_total })
            : t('admin.atencionTitulo')
        }>
        {attention.length === 0 ? (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              {t('admin.atencionTodoOk')}
            </ThemedText>
          </Card>
        ) : (
          <>
            {attention.map((student) => (
              <Pressable
                key={student.client_id}
                onPress={() => router.push(`/alumno/${student.client_id}`)}
                style={({ pressed }) => pressed && styles.pressed}>
                <Card style={styles.attentionCard}>
                  <View style={styles.flex}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {student.name}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {attentionLabel(student)}
                    </ThemedText>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={theme.brandBright}
                  />
                </Card>
              </Pressable>
            ))}
            {attention_total > attention.length ? (
              <Button
                variant="secondary"
                label={t('admin.atencionVerTodos')}
                icon="account-group-outline"
                onPress={() => router.push('/alumnos')}
              />
            ) : null}
          </>
        )}
      </SectionWrapper>

      {/* Actividad reciente */}
      <SectionWrapper title={t('admin.actividadTitulo')}>
        {activity.length === 0 ? (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              {t('admin.actividadVacio')}
            </ThemedText>
          </Card>
        ) : (
          activity.map((item, index) => (
            <ActivityRow
              key={`${item.client_id}-${item.completed_on}-${index}`}
              activity={item}
              locale={locale}
              onPress={() => router.push(`/alumno/${item.client_id}`)}
            />
          ))
        )}
      </SectionWrapper>
    </Screen>
  );
}

/**
 * Título de sección + contenido, sin el `Section` de `ui/screen` para no
 * arrastrar el gap entre tarjetas: acá cada sección maneja su propio ritmo.
 */
function SectionWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="eyebrow" themeColor="textSecondary">
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

/** Fila de actividad reciente: quién entrenó, qué bloque y hace cuánto. */
function ActivityRow({
  activity,
  locale,
  onPress,
}: {
  activity: RecentActivity;
  locale: Idioma;
  onPress: () => void;
}) {
  const theme = useTheme();
  const meta = [
    activity.block_name ?? t('admin.actividadSinBloque'),
    activity.duration_minutes != null ? formatMinutes(locale, activity.duration_minutes) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={activity.client_name}
      style={({ pressed }) => [
        styles.activityRow,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View
        style={[
          styles.activityIcon,
          { backgroundColor: theme.primarySubtle, borderColor: theme.primaryBorder },
        ]}>
        <MaterialCommunityIcons name="history" size={20} color={theme.primaryBright} />
      </View>
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {activity.client_name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {meta}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
        {formatRelativeTime(locale, activity.completed_on)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.five },
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  section: { gap: Spacing.two },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  statCell: { flexGrow: 1, flexBasis: 150, minWidth: 140 },

  attentionCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
