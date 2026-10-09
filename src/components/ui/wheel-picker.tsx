import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewProps,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/context/i18n';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/**
 * Selector deslizable (wheel picker) armado a mano: una columna de valores con
 * el valor central resaltado, como el de las alarmas del celular.
 *
 * No se usa librería: el proyecto ya trae todo lo necesario y queríamos control
 * total sobre el comportamiento en web (donde los wheel pickers de terceros
 * casi siempre dependen de scroll-snap, que react-native-web no implementa).
 *
 * Entradas soportadas:
 *  - touch / arrastre nativo (ScrollView)
 *  - rueda del mouse y trackpad en web (el ScrollView es un `div` scrolleable)
 *  - arrastre con mouse en web (handlers de mouse sobre el contenedor)
 *  - click/tap sobre cualquier valor vecino
 *  - flechas arriba/abajo y Home/End con el selector enfocado (web)
 *  - botones − / + como fallback accesible
 *  - `accessibilityRole="adjustable"` con acciones increment/decrement
 */
export type WheelOption = { value: number | null; label: string };

type Props = {
  options: WheelOption[];
  /** `null` = sin definir (la opción `null` de la lista, si existe). */
  value: number | null;
  onChange: (value: number | null) => void;
  /** Etiqueta accesible, ej: "Series". */
  label: string;
  itemHeight?: number;
  visibleCount?: number;
};

const ITEM_HEIGHT = 40;
const VISIBLE_COUNT = 5;
/** Sin actividad durante este tiempo, el scroll se alinea al valor más cercano. */
const SNAP_DEBOUNCE_MS = 130;
/** Umbral en px para distinguir click de arrastre con el mouse. */
const DRAG_THRESHOLD = 4;

type WebMouseEvent = {
  clientY: number;
  preventDefault?: () => void;
  nativeEvent?: { clientY?: number };
};
type WebKeyboardEvent = {
  key: string;
  preventDefault?: () => void;
};

export function WheelPicker({
  options,
  value,
  onChange,
  label,
  itemHeight = ITEM_HEIGHT,
  visibleCount = VISIBLE_COUNT,
}: Props) {
  const theme = useTheme();
  // Las etiquetas de accesibilidad (sumar/restar) cambian con el idioma.
  useI18n();

  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Último valor que salió DESDE el scroll: sirve para no pelear con el gesto. */
  const fromScrollRef = useRef<number | null>(null);
  const dragRef = useRef({ startY: 0, startOffset: 0, moved: false });
  const [dragging, setDragging] = useState(false);

  const half = Math.floor(visibleCount / 2);
  const pad = half * itemHeight;
  const maxOffset = Math.max(0, (options.length - 1) * itemHeight);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => Object.is(o.value, value))
  );

  useEffect(
    () => () => {
      if (snapTimer.current) clearTimeout(snapTimer.current);
    },
    []
  );

  // El valor cambió por fuera (click, teclado, botones): llevamos el scroll.
  // Si el cambio vino del propio scroll, ya estamos donde hay que estar.
  useEffect(() => {
    if (fromScrollRef.current !== null) {
      if (fromScrollRef.current === value) fromScrollRef.current = null;
      return;
    }
    const y = selectedIndex * itemHeight;
    if (Math.abs(offsetRef.current - y) < 0.5) return;
    offsetRef.current = y;
    scrollRef.current?.scrollTo({ y, animated: false });
  }, [value, selectedIndex, itemHeight]);

  function indexFromOffset(y: number): number {
    return Math.min(Math.max(Math.round(y / itemHeight), 0), options.length - 1);
  }

  function emitIndex(index: number) {
    const option = options[index];
    if (!option || Object.is(option.value, value)) return;
    fromScrollRef.current = option.value;
    onChange(option.value);
  }

  function scheduleSnap() {
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      const target = indexFromOffset(offsetRef.current) * itemHeight;
      if (Math.abs(offsetRef.current - target) > 0.5) {
        offsetRef.current = target;
        scrollRef.current?.scrollTo({ y: target, animated: true });
      }
    }, SNAP_DEBOUNCE_MS);
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    offsetRef.current = event.nativeEvent.contentOffset.y;
    emitIndex(indexFromOffset(offsetRef.current));
    scheduleSnap();
  }

  /** − / + y teclado: mueven la selección un paso. */
  function step(delta: number) {
    fromScrollRef.current = null;
    emitIndex(Math.min(Math.max(selectedIndex + delta, 0), options.length - 1));
  }

  function select(index: number) {
    fromScrollRef.current = null;
    emitIndex(Math.min(Math.max(index, 0), options.length - 1));
  }

  // ---- Web: teclado y arrastre con mouse ----------------------------------

  function handleKeyDown(event: WebKeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault?.();
      step(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault?.();
      step(-1);
    } else if (event.key === 'Home') {
      event.preventDefault?.();
      select(0);
    } else if (event.key === 'End') {
      event.preventDefault?.();
      select(options.length - 1);
    }
  }

  function dragTo(clientY: number) {
    const raw = dragRef.current.startOffset - (clientY - dragRef.current.startY);
    const y = Math.min(Math.max(raw, 0), maxOffset);
    dragRef.current.moved =
      dragRef.current.moved || Math.abs(clientY - dragRef.current.startY) > DRAG_THRESHOLD;
    offsetRef.current = y;
    scrollRef.current?.scrollTo({ y, animated: false });
    emitIndex(indexFromOffset(y));
    scheduleSnap();
  }

  useEffect(() => {
    if (Platform.OS !== 'web' || !dragging) return;
    const onMove = (event: WebMouseEvent) => dragTo(event.clientY);
    const onUp = () => setDragging(false);
    // Se escucha en `window` para que el arrastre siga aunque el mouse salga
    // del selector (típico al arrastrar rápido con la rueda del mouse).
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, options.length, itemHeight]);

  const webProps =
    Platform.OS === 'web'
      ? ({
          tabIndex: 0,
          onKeyDown: handleKeyDown,
          onMouseDown: (event: WebMouseEvent) => {
            dragRef.current = { startY: event.clientY, startOffset: offsetRef.current, moved: false };
            setDragging(true);
          },
          onMouseUp: () => setDragging(false),
          onMouseLeave: () => setDragging(false),
        } as unknown as ViewProps)
      : {};

  return (
    <View style={styles.row}>
      <StepButton icon="minus" label={t('common.restar')} onPress={() => step(-1)} />

      <View
        {...webProps}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{
          min: 0,
          max: options.length - 1,
          now: selectedIndex,
          text: options[selectedIndex]?.label ?? '',
        }}
        accessibilityActions={[
          { name: 'increment', label: t('common.sumar') },
          { name: 'decrement', label: t('common.restar') },
        ]}
        onAccessibilityAction={(event) =>
          step(event.nativeEvent.actionName === 'increment' ? 1 : -1)
        }
        style={[
          styles.wheel,
          {
            height: visibleCount * itemHeight,
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
          dragging && { borderColor: theme.primaryBorder },
        ]}>
        {/* Banda central: resalta el valor seleccionado. */}
        <View
          pointerEvents="none"
          style={[
            styles.band,
            {
              top: pad,
              height: itemHeight,
              backgroundColor: theme.primarySubtle,
              borderColor: theme.primaryBorder,
            },
          ]}
        />

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          scrollEventThrottle={16}
          onScroll={handleScroll}
          contentContainerStyle={{ paddingVertical: pad }}>
          {options.map((option, index) => {
            const distance = Math.abs(index - selectedIndex);
            const isCenter = distance === 0;
            return (
              <Pressable
                key={`${index}-${option.label}`}
                onPress={() => select(index)}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: isCenter }}
                style={[styles.item, { height: itemHeight }]}>
                <ThemedText
                  type={isCenter ? 'subtitle' : 'default'}
                  style={{
                    color: isCenter ? theme.primaryBright : theme.textSecondary,
                    opacity: isCenter ? 1 : Math.max(0.3, 1 - distance * 0.32),
                    fontVariant: ['tabular-nums'],
                  }}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <StepButton icon="plus" label={t('common.sumar')} onPress={() => step(1)} />
    </View>
  );
}

function StepButton({
  icon,
  label,
  onPress,
}: {
  icon: 'plus' | 'minus';
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.step,
        { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <MaterialCommunityIcons name={icon} size={18} color={theme.primaryBright} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  wheel: {
    flex: 1,
    minWidth: 120,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  band: {
    position: 'absolute',
    left: Spacing.one,
    right: Spacing.one,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
