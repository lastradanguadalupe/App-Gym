import { Redirect, type Href } from 'expo-router';
import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { useI18n } from '@/context/i18n';
import { useSession } from '@/context/session';
import { TabBarHeightProvider } from '@/context/tab-bar';
import { WorkoutProvider } from '@/context/workout';
import { useTheme } from '@/hooks/use-theme';
import { t, type TranslationKey } from '@/i18n';

const TABS: { name: string; href: Href; label: TranslationKey; icon: string }[] = [
  { name: 'index', href: '/', label: 'nav.inicio', icon: 'house.fill' },
  { name: 'rutina', href: '/rutina', label: 'nav.rutina', icon: 'dumbbell.fill' },
  { name: 'historial', href: '/historial', label: 'nav.historial', icon: 'clock.fill' },
  { name: 'perfil', href: '/perfil', label: 'nav.perfil', icon: 'person.fill' },
];

export default function ClientWebLayout() {
  const [tabBarHeight, setTabBarHeight] = useState(0);
  const { profile } = useSession();
  // Las etiquetas de las pestañas cambian con el idioma elegido.
  useI18n();

  // Un profe no tiene tabs de alumno: lo mandamos a su panel.
  if (profile?.role === 'profe') {
    return <Redirect href="/panel" />;
  }

  return (
    <WorkoutProvider>
      <TabBarHeightProvider height={tabBarHeight}>
        <Tabs>
          <TabSlot style={styles.slot} />
          <TabList asChild>
            <CustomTabList onHeight={setTabBarHeight}>
              {TABS.map((tab) => (
                <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
                  <TabButton label={t(tab.label)} icon={tab.icon} />
                </TabTrigger>
              ))}
            </CustomTabList>
          </TabList>
        </Tabs>
      </TabBarHeightProvider>
    </WorkoutProvider>
  );
}

function TabButton({
  label,
  icon,
  isFocused,
  ...props
}: TabTriggerSlotProps & { label: string; icon: string }) {
  const theme = useTheme();

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.tabButtonView,
        isFocused && { backgroundColor: theme.brand },
        pressed && styles.pressed,
      ]}>
      <SymbolView
        tintColor={isFocused ? theme.tintText : theme.textSecondary}
        name={icon as never}
        size={18}
      />
      <ThemedText
        type="small"
        themeColor={isFocused ? 'tintText' : 'textSecondary'}
        style={isFocused ? styles.focusedLabel : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function CustomTabList({
  onHeight,
  ...props
}: TabListProps & { onHeight: (height: number) => void }) {
  const theme = useTheme();

  return (
    <View
      {...props}
      onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
      style={styles.tabListContainer}>
      <View
        style={[
          styles.innerContainer,
          { backgroundColor: theme.brandSurface, borderColor: theme.border },
          Shadows.raised,
        ]}>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { height: '100%' },
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    padding: Spacing.one,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    maxWidth: MaxContentWidth,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabButtonView: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  focusedLabel: { fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
