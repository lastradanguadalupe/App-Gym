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
import {
  WHEEL_MIN_WIDTH,
  WHEEL_ROW_GAP,
  WHEEL_STEP_BUTTON,
  resolveWheelActiveIndex,
  type WheelOption,
} from '@/lib/wheel';

export type { WheelOption };
export { resolveWheelActiveIndex };

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
 *
 * Acepta cualquier tipo de valor (`number` o `string`): la rueda de texto solo
 * cambia en las etiquetas, la mecánica es la misma. `value = null` con un
 * `suggestedValue` deja la rueda "sin elegir": muestra el valor sugerido
 * atenuado y lo confirma en cuanto el usuario la mueve o la toca. Sin
 * `suggestedValue`, `null` es una opción más de la lista (como el "—" del panel
 * del profe), que es el comportamiento viejo.
 */
type Props<V extends number | string> = {
  options: WheelOption<V>[];
  /** `null` = sin definir (la opción `null` de la lista o el valor sugerido). */
  value: V | null;
  onChange: (value: V | null) => void;
  /** Etiqueta accesible, ej: "Series". */
  label: string;
  itemHeight?: number;
  visibleCount?: number;
  /**
   * Valor mostrado atenuado mientras `value` es `null`, a la espera de que el
   * usuario elija. Al primer gesto, ese valor se confirma y `onChange` avisa.
   */
  suggestedValue?: V;
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

export function WheelPicker<V extends number | string = number>({
  options,
  value,
  onChange,
  label,
  itemHeight = ITEM_HEIGHT,
  visibleCount = VISIBLE_COUNT,
  suggestedValue,
}: Props<V>) {
  const theme = useTheme();
  // Las etiquetas de accesibilidad (sumar/restar) cambian con el idioma.
  useI18n();

  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Último valor que salió DESDE el scroll: sirve para no pelear con el gesto. */
  const fromScrollRef = useRef<V | null>(null);
  const dragRef = useRef({ startY: 0, startOffset: 0, moved: false });
  const [dragging, setDragging] = useState(false);

  const half = Math.floor(visibleCount / 2);
  const pad = half * itemHeight;
  const maxOffset = Math.max(0, (options.length - 1) * itemHeight);

  const activeIndex = resolveWheelActiveIndex(options, value, suggestedValue);
  /** Todavía sin elegir: la rueda muestra la sugerencia atenuada. */
  const unconfirmed = value == null && suggestedValue !== undefined;

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
    const y = activeIndex * itemHeight;
    if (Math.abs(offsetRef.current - y) < 0.5) return;
    offsetRef.current = y;
    scrollRef.current?.scrollTo({ y, animated: false });
  }, [value, activeIndex, itemHeight]);

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

  /** − / + y teclado: mueven la selección un paso desde lo que se ve centrado. */
  function step(delta: number) {
    fromScrollRef.current = null;
    emitIndex(Math.min(Math.max(activeIndex + delta, 0), options.length - 1));
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
          now: activeIndex,
          text: options[activeIndex]?.label ?? '',
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
        {/* Banda central: resalta el valor seleccionado (o la sugerencia). */}
        <View
          pointerEvents="none"
          style={[
            styles.band,
            {
              top: pad,
              height: itemHeight,
              backgroundColor: theme.primarySubtle,
              borderColor: unconfirmed ? theme.border : theme.primaryBorder,
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
            const distance = Math.abs(index - activeIndex);
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
                    color: isCenter
                      ? unconfirmed
                        ? theme.textMuted
                        : theme.primaryBright
                      : theme.textSecondary,
                    opacity: isCenter ? (unconfirmed ? 0.55 : 1) : Math.max(0.3, 1 - distance * 0.32),
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
    gap: WHEEL_ROW_GAP,
  },
  wheel: {
    flex: 1,
    minWidth: WHEEL_MIN_WIDTH,
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
    width: WHEEL_STEP_BUTTON,
    height: WHEEL_STEP_BUTTON,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
