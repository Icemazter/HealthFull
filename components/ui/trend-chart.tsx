import { linearRegression } from '@/utils/health-analytics';
import React, { useState } from 'react';
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

export function TrendChart({ points, color, unit, isDark, height, selectedTimestamp, onPointSelect }: TrendChartProps) {
  if (points.length < 2) {
    return <Text style={[styles.empty, isDark && styles.emptyDark]}>Add at least two entries to begin a trend.</Text>;
  }

  const orderedPoints = [...points].sort((a, b) => a.timestamp - b.timestamp);
  const values = orderedPoints.flatMap((point) => [point.value, point.trend ?? point.value]);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const dataRange = dataMax - dataMin;
  const padding = Math.max(dataRange * 0.1, Math.abs(dataMax) * 0.005, 0.1);
  const min = Math.floor((dataMin - padding) * 10) / 10;
  const max = Math.ceil((dataMax + padding) * 10) / 10;
  const range = Math.max(max - min, 0.1);
  const selectedPoint = orderedPoints.find((point) => point.timestamp === selectedTimestamp);
  const labelCount = Math.min(5, orderedPoints.length);
  const xAxisPoints = Array.from({ length: labelCount }, (_, index) => {
    const pointIndex = Math.round(index * (orderedPoints.length - 1) / Math.max(labelCount - 1, 1));
    return orderedPoints[pointIndex];
  });
  const chartHeight = height ?? Math.min(220, 155 + Math.ceil(orderedPoints.length / 45) * 12);
  const regression = linearRegression(orderedPoints.map((point) => ({ timestamp: point.timestamp, value: point.trend ?? point.value })));
  const [plotSize, setPlotSize] = useState({ width: 0, height: 0 });

  return (
    <View style={[styles.chart, { height: chartHeight }, isDark && styles.chartDark]}>
      <Text style={[styles.axisLabel, styles.maxLabel, isDark && styles.axisLabelDark]}>{max.toFixed(1)}{unit}</Text>
      <Text style={[styles.axisLabel, styles.middleLabel, isDark && styles.axisLabelDark]}>{((max + min) / 2).toFixed(1)}{unit}</Text>
      <Text style={[styles.axisLabel, styles.minLabel, isDark && styles.axisLabelDark]}>{min.toFixed(1)}{unit}</Text>
      <View
        style={styles.plot}
        onLayout={({ nativeEvent }) => {
          const { width, height: plotHeight } = nativeEvent.layout;
          if (width !== plotSize.width || plotHeight !== plotSize.height) {
            setPlotSize({ width, height: plotHeight });
          }
        }}>
        {plotSize.width > 0 && orderedPoints.slice(0, -1).map((point, index) => {
          const nextPoint = orderedPoints[index + 1];
          const x1 = ((index + 0.5) / orderedPoints.length) * plotSize.width;
          const x2 = ((index + 1.5) / orderedPoints.length) * plotSize.width;
          const y1 = plotSize.height - ((point.trend ?? point.value) - min) / range * plotSize.height;
          const y2 = plotSize.height - ((nextPoint.trend ?? nextPoint.value) - min) / range * plotSize.height;
          const length = Math.hypot(x2 - x1, y2 - y1);
          const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
          return (
            <View
              key={`${point.timestamp}-${nextPoint.timestamp}`}
              pointerEvents="none"
              style={[styles.trendLine, { backgroundColor: color, left: x1, top: y1, width: length, transform: [{ rotate: `${angle}deg` }] }]}
            />
          );
        })}
        {orderedPoints.map((point, index) => {
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
      {regression && (
        <View style={[styles.equationBadge, isDark && styles.equationBadgeDark]}>
          <Text style={[styles.equationText, isDark && styles.equationTextDark]}>
            y = {regression.slope.toFixed(3)}x {regression.intercept >= 0 ? '+' : '-'} {Math.abs(regression.intercept).toFixed(1)}
          </Text>
        </View>
      )}
      <View style={styles.xAxisLabels}>
        {xAxisPoints.map((point, index) => (
          <Text key={`${point.timestamp}-${index}`} style={[styles.xAxisLabel, isDark && styles.axisLabelDark]}>
            {new Date(point.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Text>
        ))}
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
  chart: { position: 'relative', paddingTop: 14, paddingRight: 10, paddingBottom: 30, paddingLeft: 48, borderRadius: 12, backgroundColor: '#f8fafc' },
  chartDark: { backgroundColor: '#262626' },
  plot: { flex: 1, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-around', borderBottomWidth: 1, borderLeftWidth: 1, borderColor: '#cbd5e1' },
  pointColumn: { flex: 1, position: 'relative' },
  selectedColumn: { backgroundColor: 'rgba(37, 99, 235, 0.12)' },
  selectionGuide: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, opacity: 0.5 },
  rawPoint: { position: 'absolute', left: '50%', width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', borderWidth: 2, marginLeft: -4 },
  trendPoint: { position: 'absolute', left: '50%', width: 5, height: 5, borderRadius: 3, marginLeft: -2.5 },
  trendLine: { position: 'absolute', height: 2, borderRadius: 1, opacity: 0.7, transformOrigin: 'left center' },
  axisLabel: { position: 'absolute', left: 5, color: '#64748b', fontSize: 11 },
  axisLabelDark: { color: '#a3a3a3' },
  maxLabel: { top: 8 },
  middleLabel: { top: '47%' },
  minLabel: { bottom: 26 },
  xAxisLabels: { position: 'absolute', left: 48, right: 10, bottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  xAxisLabel: { color: '#64748b', fontSize: 10 },
  equationBadge: { position: 'absolute', top: 8, right: 8, paddingVertical: 4, paddingHorizontal: 7, borderRadius: 6, backgroundColor: '#e2e8f0' },
  equationBadgeDark: { backgroundColor: '#3f3f46' },
  equationText: { color: '#334155', fontSize: 10, fontWeight: '700' },
  equationTextDark: { color: '#f4f4f5' },
  tooltip: { position: 'absolute', top: 34, right: 8, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#e2e8f0' },
  tooltipDark: { backgroundColor: '#3f3f46' },
  tooltipText: { color: '#334155', fontSize: 11, fontWeight: '600' },
  tooltipTextDark: { color: '#f4f4f5' },
  empty: { paddingVertical: 28, textAlign: 'center', color: '#64748b' },
  emptyDark: { color: '#a3a3a3' },
});
