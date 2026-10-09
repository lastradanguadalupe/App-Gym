import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { IconName } from '@/components/ui/card';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Lado del chip de ícono. El separador se alinea con el texto, no con el borde. */
const ICON_SIZE = 36;

type ListGroupProps = {
  /** Filas `ListRow` como hijos directos. Los separadores los pone el grupo. */
  children: ReactNode;
};

/**
 * Contenedor de filas de lista: una sola tarjeta con separadores entre filas.
 *
 * Es el reemplazo de "todo en un scroll largo": cada fila es una fila, y el
 * separador lo dibuja el grupo para que no haya que acordarse de agregarlo en
 * cada pantalla.
 */
export function ListGroup({ children }: ListGroupProps) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View
      style={[
        styles.group,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderWidth: StyleSheet.hairlineWidth,
        },
      ]}>
      {rows.map((row, index) => (
        <View key={index}>
          {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
          {row}
        </View>
      ))}
    </View>
  );
}

type ListRowProps = {
  icon: IconName;
  label: string;
  /** Valor actual, alineado a la derecha: email, nombre de usuario, idioma. */
  value?: string | null;
  /** Si viene, la fila abre otra pantalla. Sin él, la fila es informativa. */
  onPress?: () => void;
  /** `danger` para acciones destructivas (cerrar sesión). */
  tone?: 'default' | 'danger';
};

/**
 * Fila de lista: ícono + label + valor + chevron.
 *
 * El ícono va en un chip teñido con `primary` (identidad), no en un color por
 * fila: el color marca el tipo de control, no decora cada item distinto.
 */
export function ListRow({
  icon,
  label,
  value,
  onPress,
  tone = 'default',
}: ListRowProps) {
  const theme = useTheme();
  const isDanger = tone === 'danger';
  const iconColor = isDanger ? theme.danger : theme.primaryBright;

  const content = (
    <>
      <View
        style={[
          styles.icon,
          {
            backgroundColor: isDanger
              ? `${theme.danger}1F`
              : theme.primarySubtle,
            borderColor: isDanger ? `${theme.danger}40` : theme.primaryBorder,
          },
        ]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>

      <ThemedText
        type="default"
        style={[styles.label, isDanger && { color: theme.danger }]}
        numberOfLines={1}>
        {label}
      </ThemedText>

      {value ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.value}>
          {value}
        </ThemedText>
      ) : null}

      {onPress ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={isDanger ? theme.danger : theme.textMuted}
        />
      ) : null}
    </>
  );

  const rowStyle = [
    styles.row,
    { backgroundColor: isDanger ? theme.surface : 'transparent' },
  ];

  if (!onPress) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}: ${value}` : label}
      style={({ pressed }) => [...rowStyle, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: ICON_SIZE + Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
    // `minHeight` además del padding: con padding solo la fila queda de 36px
    // (lo que mide el ícono) y las dos líneas de texto se recortan.
    minHeight: 64,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flexShrink: 1 },
  value: { flexShrink: 1, marginLeft: 'auto', textAlign: 'right' },
  pressed: { opacity: 0.6 },
});