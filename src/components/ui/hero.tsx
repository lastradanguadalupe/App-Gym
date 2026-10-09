import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { gradientStyle, Gradients, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

/**
 * Header de marca: degradado del azul de marca, curva inferior y contenido
 * alineado con el padding de la pantalla. Usar dentro de un `Screen
 * padded={false}` para que el degradado llegue de borde a borde.
 *
 * El degradado (`Gradients.hero`) y el color sólido de respaldo son ambos
 * derivada de `primary`: en web, donde react-native-web no entiende
 * `experimental_backgroundImage`, lo que se ve es el mismo azul plano.
 */
export function HeroHeader({ eyebrow, title, subtitle, children }: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.hero,
        { backgroundColor: theme.primaryDeep },
        gradientStyle(Gradients.hero),
      ]}>
      <View style={styles.content}>
        {eyebrow ? (
          <ThemedText type="eyebrow" themeColor="primaryBright">
            {eyebrow}
          </ThemedText>
        ) : null}
        <ThemedText type="display" themeColor="textPrimary">
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.four,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    overflow: 'hidden',
  },
  content: { gap: Spacing.two },
});
