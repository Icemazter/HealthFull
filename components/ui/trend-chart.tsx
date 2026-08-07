import { Pressable, StyleSheet, Text, View } from 'react-native';

interface TrendChartPoint {
  timestamp: number;
  value: number;
  trend?: number;
}

interface TrendChartProps {
  points: TrendChartPoint[];
  color: string;
  unit: string;
  isDark: boolean;
  height?: number;
  selectedTimestamp?: number | null;
  onPointSelect?: (point: TrendChartPoint) => void;
}

export function TrendChart({ points, color, unit, isDark, height = 150, selectedTimestamp, onPointSelect }: TrendChartProps) {
  if (points.length < 2) {
    return <Text style={[styles.empty, isDark && styles.emptyDark]}>Add at least two entries to begin a trend.</Text>;
  }

  const values = points.flatMap((point) => [point.value, point.trend ?? point.value]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.1);
  const selectedPoint = points.find((point) => point.timestamp === selectedTimestamp);

  return (
    <View style={[styles.chart, { height }, isDark && styles.chartDark]}>
      <Text style={[styles.axisLabel, styles.maxLabel, isDark && styles.axisLabelDark]}>{max.toFixed(1)}{unit}</Text>
      <Text style={[styles.axisLabel, styles.minLabel, isDark && styles.axisLabelDark]}>{min.toFixed(1)}{unit}</Text>
      <View style={styles.plot}>
        {points.map((point, index) => {
          const rawBottom = ((point.value - min) / range) * 100;
          const trendBottom = (((point.trend ?? point.value) - min) / range) * 100;
          return (
            <Pressable
              key={`${point.timestamp}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`${new Date(point.timestamp).toLocaleDateString()}: ${point.value.toFixed(1)}${unit}`}
              onPress={() => onPointSelect?.(point)}
              onHoverIn={() => onPointSelect?.(point)}
              style={[styles.pointColumn, selectedTimestamp === point.timestamp && styles.selectedColumn]}>
              {selectedTimestamp === point.timestamp && <View style={[styles.selectionGuide, { backgroundColor: color }]} />}
              <View style={[styles.trendPoint, { bottom: `${trendBottom}%`, backgroundColor: color }]} />
              <View style={[styles.rawPoint, { bottom: `${rawBottom}%`, borderColor: color }]} />
            </Pressable>
          );
        })}
      </View>
      {selectedPoint && (
        <View style={[styles.tooltip, isDark && styles.tooltipDark]}>
          <Text style={[styles.tooltipText, isDark && styles.tooltipTextDark]}>
            {new Date(selectedPoint.timestamp).toLocaleDateString()}  {selectedPoint.value.toFixed(1)}{unit}
            {selectedPoint.trend !== undefined ? `  |  Avg ${selectedPoint.trend.toFixed(1)}${unit}` : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { position: 'relative', paddingLeft: 44, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f8fafc' },
  chartDark: { backgroundColor: '#262626' },
  plot: { flex: 1, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-around', borderBottomWidth: 1, borderLeftWidth: 1, borderColor: '#cbd5e1' },
  pointColumn: { flex: 1, position: 'relative', minWidth: 4 },
  selectedColumn: { backgroundColor: 'rgba(37, 99, 235, 0.12)' },
  selectionGuide: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, opacity: 0.5 },
  rawPoint: { position: 'absolute', left: '50%', width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', borderWidth: 2, marginLeft: -4 },
  trendPoint: { position: 'absolute', left: '50%', width: 5, height: 5, borderRadius: 3, marginLeft: -2.5 },
  axisLabel: { position: 'absolute', left: 5, color: '#64748b', fontSize: 11 },
  axisLabelDark: { color: '#a3a3a3' },
  maxLabel: { top: 8 },
  minLabel: { bottom: 8 },
  tooltip: { position: 'absolute', top: 8, right: 8, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#e2e8f0' },
  tooltipDark: { backgroundColor: '#3f3f46' },
  tooltipText: { color: '#334155', fontSize: 11, fontWeight: '600' },
  tooltipTextDark: { color: '#f4f4f5' },
  empty: { paddingVertical: 28, textAlign: 'center', color: '#64748b' },
  emptyDark: { color: '#a3a3a3' },
});
