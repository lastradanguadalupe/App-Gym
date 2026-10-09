import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import type { IconName } from '@/components/ui/card';
import { IconAction } from '@/components/ui/icon-action';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { gradientStyle, Gradients, Radius, Shadows, Spacing } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useTheme } from '@/hooks/use-theme';
import { fetchProfile } from '@/lib/db';
import { t } from '@/i18n';
import type { Profile } from '@/types';

/**
 * Perfil como hub: identidad + avance + accesos.
 *
 * Ningún formulario vive acá. El cuestionario y las preferencias están en
 * pantallas propias del stack (`datos`, `medidas`, `calendario`, `ajustes`),
 * cada una con su botón de volver: un perfil que además edita todo en un scroll
 * largo es un scroll largo con pasos escondidos.
 */

/** Datos que el profe necesita para armar la rutina. Cada uno pesa igual. */
const COMPLETITUD_FIELDS = [
  'fecha_nacimiento',
  'altura_cm',
  'peso_kg',
  'objetivo',
  'experiencia',
] as const;

type CompletitudSource = {
  [K in (typeof COMPLETITUD_FIELDS)[number]]: unknown;
} | null;

function completitudPercent(details: CompletitudSource): number {
  if (!details) return 0;
  const filled = COMPLETITUD_FIELDS.filter((field) => {
    const value = details[field];
    // `0` es un valor válido (peso, altura): lo vacío es `null`/`undefined`/`''`.
    if (typeof value === 'string') return value.trim().length > 0;
    return value != null;
  });
  return Math.round((filled.length / COMPLETITUD_FIELDS.length) * 100);
}

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

export default function PerfilScreen() {
  const theme = useTheme();
  const { profile, clientDetails } = useSession();
  const [profe, setProfe] = useState<Profile | null>(null);

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

  const percent = completitudPercent(clientDetails);
  const roleLabel = profile?.role === 'profe' ? t('perfil.profe') : t('perfil.alumno');

  return (
    <Screen>
      {/* Los NativeTabs no traen header, así que este bloque hace de cabecera de
          la pantalla y el engranaje vive acá: es el mismo lugar en native y web. */}
      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: theme.brand }, gradientStyle(Gradients.accent)]}>
          <ThemedText type="subtitle" themeColor="tintText">
            {initialsOf(profile?.name)}
          </ThemedText>
        </View>
        <View style={styles.identityText}>
          <ThemedText type="display" style={styles.identityName}>
            {profile?.name ?? t('perfil.tuPerfil')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {profile?.email ? `${roleLabel} · ${profile.email}` : roleLabel}
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

      {/* Al 100% la barra se oculta: el objetivo era completarla, no contemplarla. */}
      {percent < 100 ? (
        <View style={styles.progress}>
          <ProgressBar
            percent={percent}
            label={t('perfil.avance')}
            hint={t('perfil.paraArmarRutina')}
          />
        </View>
      ) : null}

      <View style={styles.grid}>
        <QuickLink
          icon="clipboard-text-outline"
          title={t('perfil.misDatos')}
          subtitle={t('perfil.misDatosDetalle')}
          onPress={() => router.push('/perfil/datos')}
        />
        <QuickLink
          icon="chart-line"
          title={t('perfil.medidas')}
          subtitle={
            clientDetails?.peso_kg != null
              ? `${clientDetails.peso_kg} ${t('perfil.kg')}`
              : t('medidas.actual')
          }
          onPress={() => router.push('/perfil/medidas')}
        />
        <QuickLink
          icon="calendar-month-outline"
          title={t('perfil.calendario')}
          subtitle={t('perfil.calendarioDetalle')}
          onPress={() => router.push('/perfil/calendario')}
        />
        <QuickLink
          icon="clock-outline"
          title={t('perfil.historial')}
          subtitle={t('perfil.historialDetalle')}
          // Historial es un tab del navegador, no una pantalla del stack.
          onPress={() => router.push('/historial')}
        />
      </View>

      {profile?.profe_id ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('perfil.tuProfe')}:{' '}
          <ThemedText type="smallBold">{profe?.name ?? profe?.email ?? '—'}</ThemedText>
        </ThemedText>
      ) : null}
    </Screen>
  );
}

/**
 * Acceso del grid: ícono + título + detalle.
 *
 * El ícono va teñido con `primary` sin prop de color por ítem: los cuatro
 * accesos son del mismo tipo, y distinguirlos por color inventaría jerarquía.
 */
function QuickLink({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      style={({ pressed }) => [
        styles.link,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View
        style={[
          styles.linkIcon,
          { backgroundColor: theme.primarySubtle, borderColor: theme.primaryBorder },
        ]}>
        <MaterialCommunityIcons name={icon} size={22} color={theme.primaryBright} />
      </View>
      <ThemedText type="smallBold" numberOfLines={1}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {subtitle}
      </ThemedText>
    </Pressable>
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
  progress: { marginTop: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  link: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.card,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});