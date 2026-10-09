import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
  Line as SvgLine,
  Text as SvgText,
} from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { scaleToRange } from '@/lib/calendar';

/**
 * Gráfico de línea SVG para la evolución de una medida (peso, altura).
 *
 * Por qué SVG y no una librería de charts: es una línea con relleno, un punto
 * por medición y dos etiquetas de eje. Dibujarlo directo evita una dependencia
 * grande y deja el color y los textos atados a los tokens del tema. La
 * geometría (escala 0–1) vive en `lib/calendar.ts` y está testeada; acá solo se
 * proyecta a píxeles.
 */

export type ChartPoint = {
  /** Etiqueta del eje X: la fecha corta de la medición. */
  label: string;
  value: number;
};

type Props = {
  data: ChartPoint[];
  /** Formatea el valor de los ejes y del tooltip, p. ej. `72.4 kg`. */
  formatValue: (value: number) => string;
  /** Alto total del gráfico, sin contar las etiquetas de los ejes. */
  height?: number;
  /** Dibuja la línea punteada horizontal con el promedio. */
  showAverage?: boolean;
};

const PADDING_X = 14;
const TOP_PAD = 12;
const BOTTOM_PAD = 10;
const DOT_RADIUS = 3.5;
const LAST_DOT_RADIUS = 5.5;

export function WeightChart({ data, formatValue, height = 180, showAverage = true }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  if (data.length === 0) return null;

  const plotHeight = height - TOP_PAD - BOTTOM_PAD;
  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const scaled = scaleToRange(values);
  const average = values.reduce((acc, value) => acc + value, 0) / values.length;

  // Un solo punto no tiene línea: se muestra como punto centricado, porque una
  // polilínea de un punto no se ve en pantalla.
  const usableWidth = Math.max(0, width - PADDING_X * 2);
  const stepX = data.length > 1 ? usableWidth / (data.length - 1) : 0;
  const centerX = usableWidth / 2;

  const points = data.map((point, index) => ({
    ...point,
    x: PADDING_X + (data.length > 1 ? stepX * index : centerX),
    // SVG crece hacia abajo, así que el valor 1 (máximo) va arriba: `y = 0` es
    // el tope del área de dibujo.
    y: TOP_PAD + (1 - scaled[index]) * plotHeight,
  }));

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(' ');

  const areaPath =
    points.length > 1
      ? `${linePath} L${points[points.length - 1].x.toFixed(2)},${(TOP_PAD + plotHeight).toFixed(2)} L${points[0].x.toFixed(2)},${(TOP_PAD + plotHeight).toFixed(2)} Z`
      : '';

  const averageY = TOP_PAD + (1 - scaleToRange([min, max, average])[2]) * plotHeight;
  const gradientId = 'weightChartFill';

  return (
    <View onLayout={onLayout} style={styles.wrap}>
      {width > 0 ? (
        <Svg width={width} height={height} accessibilityRole="image">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              {/* `stopOpacity` en vez de un rgba() en `stopColor`: SVG no
                  interpreta rgba() en todos los motores (web incluido). */}
              <Stop offset="0" stopColor={theme.primary} stopOpacity={0.28} />
              <Stop offset="1" stopColor={theme.primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {showAverage && data.length > 1 ? (
            <>
              <SvgLine
                x1={0}
                y1={averageY}
                x2={width}
                y2={averageY}
                stroke={theme.border}
                strokeWidth={1}
                strokeDasharray="4 5"
              />
              <SvgText
                x={width}
                y={averageY - 5}
                fill={theme.textMuted}
                fontSize={10}
                textAnchor="end">
                {formatValue(average)}
              </SvgText>
            </>
          ) : null}

          {areaPath ? <Path d={areaPath} fill={`url(#${gradientId})`} /> : null}
          <Path
            d={linePath}
            fill="none"
            stroke={theme.primary}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <G>
            {points.map((point, index) => {
              const isLast = index === points.length - 1;
              return (
                <Circle
                  key={`${point.label}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={isLast ? LAST_DOT_RADIUS : DOT_RADIUS}
                  fill={isLast ? theme.primary : theme.surface}
                  stroke={theme.primary}
                  strokeWidth={2}
                />
              );
            })}
          </G>
        </Svg>
      ) : null}

      <View style={styles.axis}>
        <ThemedText type="small" themeColor="textMuted">
          {formatValue(min)}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted">
          {data.length > 1 ? `${data[0].label} → ${data[data.length - 1].label}` : data[0].label}
        </ThemedText>
        {data.length > 1 ? (
          <ThemedText type="small" themeColor="textMuted">
            {formatValue(max)}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  axis: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});