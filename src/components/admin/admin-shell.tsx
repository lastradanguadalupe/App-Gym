import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, usePathname, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing, type ThemeColor } from '@/constants/theme';
import { useI18n } from '@/context/i18n';
import { useSession } from '@/context/session';
import { countAlumnos, fetchAlumnos } from '@/lib/db';
import { useTheme } from '@/hooks/use-theme';
import { t, type TranslationKey } from '@/i18n';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Ancho mínimo a partir del cual el sidebar queda fijo y se puede colapsar. */
const WIDE_BREAKPOINT = 900;
const SIDEBAR_WIDTH = 264;
const SIDEBAR_COLLAPSED_WIDTH = 76;
const DRAWER_WIDTH = 280;
/** Cuántos alumnos se listan como sub-ítems antes del "y N más". */
const SUBITEM_LIMIT = 8;
const COLLAPSED_KEY = 'admin.sidebar.collapsed';

type Section = {
  key: string;
  href: Href;
  labelKey: TranslationKey;
  icon: IconName;
  isActive: (pathname: string) => boolean;
};

const SECTIONS: Section[] = [
  {
    key: 'alumnos',
    href: '/panel',
    labelKey: 'admin.navAlumnos',
    icon: 'account-group-outline',
    isActive: (p) => p === '/panel' || p.startsWith('/alumno'),
  },
  {
    key: 'ejercicios',
    href: '/ejercicios',
    labelKey: 'admin.catalogoEjercicios',
    icon: 'dumbbell',
    isActive: (p) => p.startsWith('/ejercicios'),
  },
  {
    key: 'contenido',
    href: '/contenido',
    labelKey: 'admin.frasesYTips',
    icon: 'lightbulb-outline',
    isActive: (p) => p.startsWith('/contenido'),
  },
];

/**
 * Marco de navegación del panel del profe: sidebar a la izquierda y stack de
 * pantallas a la derecha.
 *
 * Responsive:
 *  - ancho (>= 900): sidebar fijo, la hamburguesa lo colapsa a una barra de
 *    íconos. La preferencia se recuerda en AsyncStorage.
 *  - angosto: sidebar oculto, la hamburguesa lo abre como drawer con fondo
 *    oscurecido que lo cierra al tocar afuera.
 *
 * Las pantallas (`panel`, `ejercicios`, `contenido`, `alumno/[id]`) y su lógica
 * siguen siendo las mismas: esto solo cambia el marco.
 */
export function AdminShell() {
  const theme = useTheme();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { profile, signOut } = useSession();
  // Títulos y etiquetas del nav cambian con el idioma.
  useI18n();

  const wide = width >= WIDE_BREAKPOINT;
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Preferencia de colapso (solo tiene sentido en pantalla ancha).
  useEffect(() => {
    AsyncStorage.getItem(COLLAPSED_KEY)
      .then((value) => {
        if (value != null) setCollapsed(value === 'true');
      })
      .catch(() => {});
  }, []);

  // Al pasar a ancho, el drawer superpuesto ya no aplica.
  useEffect(() => {
    if (wide) setDrawerOpen(false);
  }, [wide]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      AsyncStorage.setItem(COLLAPSED_KEY, String(next)).catch(() => {});
      return next;
    });
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const sidebar = (
    <AdminSidebar
      collapsed={wide && collapsed}
      onNavigate={() => {
        if (!wide) closeDrawer();
      }}
      pathname={pathname}
      profeName={profile?.name ?? null}
      profeId={profile?.id ?? null}
      onSignOut={() => void signOut()}
    />
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {wide ? sidebar : null}

      <View style={styles.main}>
        <Stack
          screenOptions={{
            headerShown: true,
            headerBackButtonDisplayMode: 'minimal',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerTitleStyle: { color: theme.text, fontWeight: '800', fontSize: 20 },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.background },
            headerLeft: () => (
              <Hamburger
                wide={wide}
                collapsed={collapsed}
                onToggle={toggleCollapsed}
                onOpen={() => setDrawerOpen(true)}
              />
            ),
          }}>
          <Stack.Screen name="panel" options={{ title: t('admin.misAlumnos') }} />
          <Stack.Screen name="alumno/[id]" options={{ title: t('admin.alumno') }} />
          <Stack.Screen name="ejercicios" options={{ title: t('admin.ejerciciosTitulo') }} />
          <Stack.Screen name="contenido" options={{ title: t('admin.contenido') }} />
        </Stack>
      </View>

      {!wide && drawerOpen ? (
        <>
          <Pressable
            style={styles.scrim}
            onPress={closeDrawer}
            accessibilityRole="button"
            accessibilityLabel={t('common.cerrarMenu')}
          />
          <View style={[styles.drawer, Shadows.raised]}>{sidebar}</View>
        </>
      ) : null}
    </View>
  );
}

/** Botón de hamburguesa del header: colapsa (ancho) o abre el drawer (angosto). */
function Hamburger({
  wide,
  collapsed,
  onToggle,
  onOpen,
}: {
  wide: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  // En la ficha de un alumno dejamos además el botón de volver.
  const canGoBack = router.canGoBack() && pathname.startsWith('/alumno');

  return (
    <View style={styles.headerLeft}>
      {canGoBack ? (
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.atras')}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={theme.text} />
        </Pressable>
      ) : null}
      <Pressable
        onPress={wide ? onToggle : onOpen}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={wide && !collapsed ? t('common.cerrarMenu') : t('common.abrirMenu')}
        style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
        <MaterialCommunityIcons
          name={wide && !collapsed ? 'menu-open' : 'menu'}
          size={22}
          color={theme.text}
        />
      </Pressable>
    </View>
  );
}

function AdminSidebar({
  collapsed,
  pathname,
  profeName,
  profeId,
  onNavigate,
  onSignOut,
}: {
  collapsed: boolean;
  pathname: string;
  profeName: string | null;
  profeId: string | null;
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();

  const [alumnosOpen, setAlumnosOpen] = useState(false);
  const [alumnos, setAlumnos] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Lista liviana de alumnos para saltar rápido desde el sidebar.
  useEffect(() => {
    if (!alumnosOpen || collapsed || !profeId || loaded) return;
    let active = true;
    (async () => {
      try {
        const [list, count] = await Promise.all([
          fetchAlumnos(profeId, 0, SUBITEM_LIMIT),
          countAlumnos(profeId),
        ]);
        if (!active) return;
        setAlumnos(list.map((a) => ({ id: a.id, name: a.name, email: a.email })));
        setTotal(count);
      } catch (e) {
        console.warn('Error cargando alumnos del sidebar', e);
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [alumnosOpen, collapsed, profeId, loaded]);

  function go(href: Href) {
    router.push(href);
    onNavigate();
  }

  return (
    <View
      style={[
        styles.sidebar,
        collapsed ? styles.sidebarCollapsed : styles.sidebarExpanded,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}>
      {/* Marca + profe */}
      <View style={[styles.brand, collapsed && styles.brandCollapsed]}>
        <View
          style={[
            styles.brandMark,
            { backgroundColor: theme.surfaceBrand, borderColor: theme.primaryBorder },
          ]}>
          <MaterialCommunityIcons name="dumbbell" size={20} color={theme.primaryBright} />
        </View>
        {!collapsed ? (
          <View style={styles.flex}>
            <ThemedText type="smallBold">AppGym</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {profeName ?? t('admin.panelProfe')}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <ScrollView
        style={styles.nav}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}>
        {SECTIONS.map((section) => {
          const active = section.isActive(pathname);
          const isAlumnos = section.key === 'alumnos';
          return (
            <View key={section.key}>
              <NavItem
                icon={section.icon}
                label={t(section.labelKey)}
                active={active}
                collapsed={collapsed}
                onPress={() => go(section.href)}
                trailing={
                  isAlumnos && !collapsed ? (
                    <Pressable
                      onPress={() => setAlumnosOpen((open) => !open)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.abrirMenu')}
                      style={({ pressed }) => [styles.chevron, pressed && styles.pressed]}>
                      <MaterialCommunityIcons
                        name={alumnosOpen ? 'chevron-down' : 'chevron-right'}
                        size={18}
                        color={theme.textSecondary}
                      />
                    </Pressable>
                  ) : null
                }
              />

              {isAlumnos && alumnosOpen && !collapsed ? (
                <View style={styles.subList}>
                  {alumnos.map((a) => {
                    const subActive = pathname === `/alumno/${a.id}`;
                    return (
                      <Pressable
                        key={a.id}
                        onPress={() => go(`/alumno/${a.id}`)}
                        style={({ pressed }) => [
                          styles.subItem,
                          subActive && { backgroundColor: theme.primarySubtle },
                          pressed && styles.pressed,
                        ]}>
                        <ThemedText
                          type="small"
                          numberOfLines={1}
                          themeColor={subActive ? 'primaryBright' : 'textSecondary'}>
                          {a.name ?? a.email}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                  {loaded && total > SUBITEM_LIMIT ? (
                    <Pressable
                      onPress={() => go('/panel')}
                      style={({ pressed }) => [styles.subItem, pressed && styles.pressed]}>
                      <ThemedText type="small" themeColor="brandBright">
                        {t('admin.masAlumnos', { count: total - SUBITEM_LIMIT })}
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {/* Cerrar sesión, separado abajo */}
      <View style={[styles.bottom, { borderColor: theme.border }]}>
        <NavItem
          icon="logout"
          label={t('common.cerrarSesion')}
          active={false}
          collapsed={collapsed}
          danger
          onPress={onSignOut}
        />
      </View>
    </View>
  );
}

function NavItem({
  icon,
  label,
  active,
  collapsed,
  danger,
  onPress,
  trailing,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  collapsed: boolean;
  danger?: boolean;
  onPress: () => void;
  trailing?: ReactNode;
}) {
  const theme = useTheme();

  const color: ThemeColor = danger ? 'danger' : active ? 'primaryBright' : 'textSecondary';
  const background = active
    ? theme.primarySubtle
    : danger
      ? `${theme.danger}14`
      : 'transparent';
  const border = active ? theme.primaryBorder : danger ? `${theme.danger}33` : 'transparent';

  return (
    <View style={styles.navItemWrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.navItem,
          collapsed && styles.navItemCollapsed,
          { backgroundColor: background, borderColor: border },
          pressed && styles.pressed,
        ]}>
        <MaterialCommunityIcons name={icon} size={20} color={theme[color]} />
        {!collapsed ? (
          <ThemedText
            type="smallBold"
            themeColor={color}
            style={styles.flex}
            numberOfLines={1}>
            {label}
          </ThemedText>
        ) : null}
      </Pressable>
      {!collapsed && trailing ? <View style={styles.navTrailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  main: { flex: 1 },
  flex: { flex: 1 },

  sidebar: {
    height: '100%',
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
  },
  sidebarExpanded: { width: SIDEBAR_WIDTH },
  sidebarCollapsed: { width: SIDEBAR_COLLAPSED_WIDTH },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    marginBottom: Spacing.two,
  },
  brandCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  nav: { flex: 1 },
  navContent: { gap: Spacing.one, paddingHorizontal: Spacing.two },
  navItemWrap: { position: 'relative' },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  navItemCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  navTrailing: { position: 'absolute', right: Spacing.two, top: 0, bottom: 0, justifyContent: 'center' },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  subList: { gap: 2, paddingVertical: Spacing.one, paddingLeft: Spacing.md },
  subItem: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
  },

  bottom: {
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.two,
  },

  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    zIndex: 11,
  },

  pressed: { opacity: 0.6 },
});
