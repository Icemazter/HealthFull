import { StyleSheet, Text, View } from 'react-native';

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
}

export function TrendChart({ points, color, unit, isDark, height = 150 }: TrendChartProps) {
  if (points.length < 2) {
    return <Text style={[styles.empty, isDark && styles.emptyDark]}>Add at least two entries to begin a trend.</Text>;
  }

  const values = points.flatMap((point) => [point.value, point.trend ?? point.value]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.1);

  return (
    <View style={[styles.chart, { height }, isDark && styles.chartDark]}>
      <Text style={[styles.axisLabel, styles.maxLabel, isDark && styles.axisLabelDark]}>{max.toFixed(1)}{unit}</Text>
      <Text style={[styles.axisLabel, styles.minLabel, isDark && styles.axisLabelDark]}>{min.toFixed(1)}{unit}</Text>
      <View style={styles.plot}>
        {points.map((point, index) => {
          const rawBottom = ((point.value - min) / range) * 100;
          const trendBottom = (((point.trend ?? point.value) - min) / range) * 100;
          return (
            <View key={`${point.timestamp}-${index}`} style={styles.pointColumn}>
              <View style={[styles.trendPoint, { bottom: `${trendBottom}%`, backgroundColor: color }]} />
              <View style={[styles.rawPoint, { bottom: `${rawBottom}%`, borderColor: color }]} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { position: 'relative', paddingLeft: 44, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f8fafc' },
  chartDark: { backgroundColor: '#262626' },
  plot: { flex: 1, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-around', borderBottomWidth: 1, borderLeftWidth: 1, borderColor: '#cbd5e1' },
  pointColumn: { flex: 1, position: 'relative', minWidth: 4 },
  rawPoint: { position: 'absolute', left: '50%', width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', borderWidth: 2, marginLeft: -4 },
  trendPoint: { position: 'absolute', left: '50%', width: 5, height: 5, borderRadius: 3, marginLeft: -2.5 },
  axisLabel: { position: 'absolute', left: 5, color: '#64748b', fontSize: 11 },
  axisLabelDark: { color: '#a3a3a3' },
  maxLabel: { top: 8 },
  minLabel: { bottom: 8 },
  empty: { paddingVertical: 28, textAlign: 'center', color: '#64748b' },
  emptyDark: { color: '#a3a3a3' },
});
