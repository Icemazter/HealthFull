import { TrendChart } from '@/components/ui/trend-chart';
import { Palette } from '@/constants/theme';
import {
  buildWeightTrend,
  calculateMacroAdherence,
  calculateWaistToHeight,
  estimateAdaptiveGuidance,
  forecastWeight,
  latestMeasurementByType,
  type MeasurementEntry,
  type NutritionEntry,
  type WeightEntry,
} from '@/utils/health-analytics';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/use-theme';

type RangeDays = 30 | 90 | 365;

interface BodyStats {
  heightCm?: string;
}

interface ProgressData {
  foods: NutritionEntry[];
  weights: WeightEntry[];
  measurements: MeasurementEntry[];
  goals: Record<string, string | number>;
  heightCm: number;
}

const defaultData: ProgressData = { foods: [], weights: [], measurements: [], goals: {}, heightCm: 0 };

const filterRange = <T extends { timestamp: number }>(entries: T[], range: RangeDays) => {
  const threshold = Date.now() - range * 24 * 60 * 60 * 1000;
  return entries.filter((entry) => entry.timestamp >= threshold);
};

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme, colorScheme } = useAppTheme();
  const [range, setRange] = useState<RangeDays>(90);
  const [measurementType, setMeasurementType] = useState('Waist');
  const [data, setData] = useState<ProgressData>(defaultData);

  const loadProgress = useCallback(async () => {
    const [foods, weights, measurements, goals, bodyStats] = await Promise.all([
      storage.get<NutritionEntry[]>(STORAGE_KEYS.FOOD_ENTRIES, []),
      storage.get<WeightEntry[]>(STORAGE_KEYS.WEIGHT_HISTORY, []),
      storage.get<MeasurementEntry[]>(STORAGE_KEYS.BODY_MEASUREMENTS, []),
      storage.get<Record<string, string | number>>(STORAGE_KEYS.MACRO_GOALS, {}),
      storage.get<BodyStats>(STORAGE_KEYS.BODY_STATS, {}),
    ]);
    setData({
      foods: foods ?? [],
      weights: weights ?? [],
      measurements: measurements ?? [],
      goals: goals ?? {},
      heightCm: Number(bodyStats?.heightCm) || 0,
    });
  }, []);

  useFocusEffect(useCallback(() => {
    loadProgress();
  }, [loadProgress]));

  const rangedWeights = useMemo(() => filterRange(data.weights, range), [data.weights, range]);
  const weightTrend = useMemo(() => buildWeightTrend(rangedWeights).slice(-20), [rangedWeights]);
  const projection = useMemo(() => forecastWeight(rangedWeights), [rangedWeights]);
  const macro = useMemo(() => calculateMacroAdherence(filterRange(data.foods, range), data.goals as any), [data.foods, data.goals, range]);
  const adaptiveGuidance = useMemo(() => estimateAdaptiveGuidance(data.foods, data.weights, data.goals as any), [data.foods, data.goals, data.weights]);
  const types = useMemo(() => [...new Set(data.measurements.map((entry) => entry.type))], [data.measurements]);
  const selectedMeasurements = useMemo(
    () => filterRange(data.measurements.filter((entry) => entry.type === measurementType), range)
      .map((entry) => ({ ...entry, value: Number(entry.value) }))
      .filter((entry) => Number.isFinite(entry.value)),
    [data.measurements, measurementType, range]
  );
  const waist = latestMeasurementByType(data.measurements, 'Waist');
  const waistToHeight = waist ? calculateWaistToHeight(Number(waist.value), data.heightCm) : null;

  const statCards = [
    { value: macro.loggedDays, label: 'Days Logged' },
    { value: `${macro.adherence.protein ?? 0}%`, label: 'Protein Average' },
    { value: projection ? `${projection.weeklyRateKg >= 0 ? '+' : ''}${projection.weeklyRateKg.toFixed(2)} kg` : '—', label: 'Weekly Trend' },
    { value: projection?.confidence ?? 'Needs data', label: 'Forecast Confidence' },
  ];

  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]} contentContainerStyle={styles.content}>
      <View style={[styles.header, isDark && styles.headerDark, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={[styles.headerTitle, isDark && styles.textDark]}>Progress</Text>
        <Pressable style={styles.themeToggle} onPress={toggleTheme}>
          <Text style={styles.themeToggleIcon}>{colorScheme === 'dark' ? 'Dark' : colorScheme === 'light' ? 'Light' : 'Auto'}</Text>
        </Pressable>
      </View>

      <View style={styles.rangeRow}>
        {([30, 90, 365] as RangeDays[]).map((days) => (
          <Pressable key={days} style={[styles.rangeButton, isDark && styles.rangeButtonDark, range === days && styles.rangeButtonActive]} onPress={() => setRange(days)}>
            <Text style={[styles.rangeText, isDark && styles.textDark, range === days && styles.rangeTextActive]}>{days} days</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.grid}>
        {statCards.map((stat) => (
          <View key={stat.label} style={[styles.statCard, isDark && styles.cardDark]}>
            <Text style={[styles.statValue, isDark && styles.textDark]}>{stat.value}</Text>
            <Text style={[styles.statLabel, isDark && styles.mutedDark]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>Weight trend</Text>
        <Text style={[styles.description, isDark && styles.mutedDark]}>Open circles are weigh-ins; solid points show your 7-day rolling average.</Text>
        <TrendChart points={weightTrend} color="#2563eb" unit=" kg" isDark={isDark} />
        {projection ? (
          <View style={[styles.insight, isDark && styles.insightDark]}>
            <Text style={[styles.insightTitle, isDark && styles.textDark]}>28-day estimate</Text>
            <Text style={[styles.insightText, isDark && styles.mutedDark]}>
              Based on {projection.sampleSize} recent weigh-ins, your estimated weight in 28 days is {projection.projectedWeight.toFixed(1)} kg (range {projection.lowerBound.toFixed(1)}–{projection.upperBound.toFixed(1)} kg).
            </Text>
          </View>
        ) : (
          <Text style={[styles.helpText, isDark && styles.mutedDark]}>Log at least 7 weigh-ins to unlock a conservative 28-day projection.</Text>
        )}
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>Macro adherence</Text>
        <Text style={[styles.description, isDark && styles.mutedDark]}>Average intake across days with food logged in the selected range.</Text>
        {(['calories', 'protein', 'carbs', 'fat', 'fiber'] as const).map((key) => (
          <View key={key} style={styles.macroRow}>
            <Text style={[styles.macroName, isDark && styles.textDark]}>{key[0].toUpperCase() + key.slice(1)}</Text>
            <View style={[styles.macroTrack, isDark && styles.macroTrackDark]}>
              <View style={[styles.macroFill, { width: `${macro.adherence[key]}%` }]} />
            </View>

            <View style={[styles.card, isDark && styles.cardDark]}>
              <Text style={[styles.cardTitle, isDark && styles.textDark]}>Adaptive guidance</Text>
              {adaptiveGuidance ? (
                <>
                  <Text style={[styles.description, isDark && styles.mutedDark]}>{adaptiveGuidance.message}</Text>
                  <Text style={[styles.guidanceValue, isDark && styles.textDark]}>Estimated maintenance: {adaptiveGuidance.maintenanceCalories} kcal/day</Text>
                  <Text style={[styles.helpText, isDark && styles.mutedDark]}>A conservative adjusted target would be {adaptiveGuidance.suggestedCalories} kcal/day. Confidence: {adaptiveGuidance.confidence}.</Text>
                </>
              ) : (
                <Text style={[styles.helpText, isDark && styles.mutedDark]}>Adaptive guidance unlocks after at least 14 days of food logging and 14 weigh-ins. It is informational and not medical advice.</Text>
              )}
            </View>
            <Text style={[styles.macroPercent, isDark && styles.mutedDark]}>{macro.adherence[key]}%</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>Measurements</Text>
        {types.length > 0 ? (
          <>
            <View style={styles.measurementTypes}>
              {types.map((type) => (
                <Pressable key={type} style={[styles.measurementChip, isDark && styles.rangeButtonDark, measurementType === type && styles.rangeButtonActive]} onPress={() => setMeasurementType(type)}>
                  <Text style={[styles.rangeText, isDark && styles.textDark, measurementType === type && styles.rangeTextActive]}>{type}</Text>
                </Pressable>
              ))}
            </View>
            <TrendChart points={selectedMeasurements} color="#16a34a" unit=" cm" isDark={isDark} />
          </>
        ) : (
          <Text style={[styles.helpText, isDark && styles.mutedDark]}>Log circumference measurements to compare changes beyond the scale.</Text>
        )}
        {waistToHeight && (
          <Text style={[styles.helpText, isDark && styles.mutedDark]}>Waist-to-height ratio: {waistToHeight.toFixed(2)}. This is a screening measure, not a diagnosis.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.white },
  containerDark: { backgroundColor: '#0a0a0a' },
  content: { paddingBottom: 32 },
  header: { paddingBottom: 20, paddingHorizontal: 20, backgroundColor: Palette.lightGray, borderBottomWidth: 1, borderBottomColor: '#e5e5e5', flexDirection: 'row', alignItems: 'center' },
  headerDark: { backgroundColor: '#1a1a1a', borderBottomColor: '#333' },
  headerTitle: { flex: 1, fontSize: 30, fontWeight: 'bold', color: Palette.primary },
  themeToggle: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#e2e8f0' },
  themeToggleIcon: { fontSize: 12, fontWeight: '700', color: '#334155' },
  rangeRow: { flexDirection: 'row', gap: 8, margin: 16, marginBottom: 4 },
  rangeButton: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#e2e8f0' },
  rangeButtonDark: { backgroundColor: '#333' },
  rangeButtonActive: { backgroundColor: Palette.primary },
  rangeText: { fontWeight: '600', color: '#334155' },
  rangeTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, margin: 16 },
  statCard: { width: '47%', padding: 16, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  card: { marginHorizontal: 16, marginBottom: 16, padding: 20, borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  cardDark: { backgroundColor: '#1a1a1a', borderColor: '#333' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  statLabel: { marginTop: 4, color: '#64748b', fontSize: 13 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  description: { color: '#64748b', lineHeight: 20, marginTop: 6, marginBottom: 16 },
  insight: { marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: '#eff6ff' },
  insightDark: { backgroundColor: '#172554' },
  insightTitle: { fontWeight: '700', color: '#111827', marginBottom: 4 },
  insightText: { color: '#475569', lineHeight: 20 },
  helpText: { marginTop: 16, color: '#64748b', lineHeight: 20 },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  macroName: { width: 66, color: '#111827', fontSize: 13, fontWeight: '600' },
  macroTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#e2e8f0' },
  macroTrackDark: { backgroundColor: '#404040' },
  macroFill: { height: '100%', borderRadius: 4, backgroundColor: Palette.primary },
  macroPercent: { width: 38, textAlign: 'right', color: '#64748b', fontSize: 12 },
  measurementTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, marginBottom: 12 },
  measurementChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#e2e8f0' },
  guidanceValue: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 4 },
  textDark: { color: '#f5f5f5' },
  mutedDark: { color: '#a3a3a3' },
});
