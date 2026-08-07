import { TrendChart } from '@/components/ui/trend-chart';
import { Palette } from '@/constants/theme';
import {
  buildWeightTrend,
  calculateGoalPace,
  calculateDataQuality,
  calculateMacroAdherence,
  calculateMeasurementChange,
  calculateWaistToHeight,
  compareNutritionPeriods,
  estimateAdaptiveGuidance,
  forecastWeight,
  latestMeasurementByType,
  summarizeDailyContext,
  type DailyContextEntry,
  type MeasurementEntry,
  type NutritionEntry,
  type WeightEntry,
} from '@/utils/health-analytics';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/use-theme';

type RangeDays = 30 | 90 | 365;
type AnalyticsDisplayMode = 'chart' | 'values';

interface BodyStats {
  heightCm?: string;
}

interface ProgressData {
  foods: NutritionEntry[];
  weights: WeightEntry[];
  measurements: MeasurementEntry[];
  contexts: DailyContextEntry[];
  goals: Record<string, string | number>;
  heightCm: number;
}

interface ProgressGoal {
  targetWeight: string;
  targetDate: string;
}

const defaultData: ProgressData = { foods: [], weights: [], measurements: [], contexts: [], goals: {}, heightCm: 0 };

const createDemoAnalyticsData = (): { data: ProgressData; goal: ProgressGoal } => {
  const day = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(9, 0, 0, 0);
  const foods: NutritionEntry[] = [];
  const weights: WeightEntry[] = [];
  const measurements: MeasurementEntry[] = [];
  const contexts: DailyContextEntry[] = [];

  for (let index = 41; index >= 0; index -= 1) {
    const timestamp = today.getTime() - index * day;
    const variation = ((index * 7) % 9) - 4;
    foods.push({
      timestamp,
      calories: 2240 + variation * 28,
      protein: 164 + variation,
      carbs: 230 + variation * 3,
      fat: 73 - variation,
      fiber: 31 + (index % 4),
    });
    weights.push({ timestamp, weight: Number((86.2 - (41 - index) * 0.065 + variation * 0.04).toFixed(1)) });
    contexts.push({
      timestamp,
      sleepHours: Number((7.2 + ((index % 5) - 2) * 0.25).toFixed(1)),
      hunger: index % 8 === 0 ? 'High' : index % 3 === 0 ? 'Low' : 'Moderate',
      stress: index % 9 === 0 ? 'High' : index % 4 === 0 ? 'Low' : 'Moderate',
      digestion: index % 10 === 0 ? 'Uncomfortable' : index % 4 === 0 ? 'Mixed' : 'Comfortable',
    });
    if (index % 7 === 0) {
      const week = (41 - index) / 7;
      measurements.push(
        { timestamp, type: 'Waist', value: Number((88.5 - week * 0.45).toFixed(1)) },
        { timestamp, type: 'Chest', value: Number((103.5 - week * 0.1).toFixed(1)) },
        { timestamp, type: 'Hip', value: Number((101.2 - week * 0.25).toFixed(1)) }
      );
    }
  }

  const targetDate = new Date(today.getTime() + 45 * day);
  return {
    data: {
      foods,
      weights,
      measurements,
      contexts,
      goals: { calories: 2250, protein: 165, carbs: 230, fat: 75, fiber: 30 },
      heightCm: 178,
    },
    goal: { targetWeight: '80', targetDate: targetDate.toISOString().slice(0, 10) },
  };
};

const demoAnalytics = createDemoAnalyticsData();

const filterRange = <T extends { timestamp: number }>(entries: T[], range: RangeDays) => {
  const threshold = Date.now() - range * 24 * 60 * 60 * 1000;
  return entries.filter((entry) => entry.timestamp >= threshold);
};

interface DisplayPoint {
  timestamp: number;
  value: number;
  trend?: number;
}

function AnalyticsToggle({ mode, onChange, isDark, chartLabel = 'Chart' }: {
  mode: AnalyticsDisplayMode;
  onChange: (mode: AnalyticsDisplayMode) => void;
  isDark: boolean;
  chartLabel?: string;
}) {
  return (
    <View style={[styles.analyticsToggle, isDark && styles.analyticsToggleDark]}>
      {([['chart', chartLabel], ['values', 'Values']] as const).map(([value, label]) => (
        <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityState={{ selected: mode === value }}
          onPress={() => onChange(value)}
          style={[styles.analyticsToggleButton, mode === value && styles.analyticsToggleButtonActive]}>
          <Text style={[styles.analyticsToggleText, isDark && styles.analyticsToggleTextDark, mode === value && styles.analyticsToggleTextActive]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ValueTable({ points, unit, isDark, selectedTimestamp, onSelect, showTrend = false }: {
  points: DisplayPoint[];
  unit: string;
  isDark: boolean;
  selectedTimestamp: number | null;
  onSelect: (point: DisplayPoint) => void;
  showTrend?: boolean;
}) {
  return (
    <View style={[styles.valueTable, isDark && styles.valueTableDark]}>
      <View style={styles.valueTableHeader}>
        <Text style={[styles.valueTableHeaderText, isDark && styles.mutedDark]}>Date</Text>
        <Text style={[styles.valueTableHeaderText, isDark && styles.mutedDark]}>Value</Text>
        {showTrend && <Text style={[styles.valueTableHeaderText, isDark && styles.mutedDark]}>7-day avg</Text>}
      </View>
      {points.slice(-20).reverse().map((point) => (
        <Pressable
          key={point.timestamp}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedTimestamp === point.timestamp }}
          onPress={() => onSelect(point)}
          style={[styles.valueTableRow, selectedTimestamp === point.timestamp && styles.valueTableRowSelected]}>
          <Text style={[styles.valueTableText, isDark && styles.textDark]}>{new Date(point.timestamp).toLocaleDateString()}</Text>
          <Text style={[styles.valueTableText, isDark && styles.textDark]}>{point.value.toFixed(1)} {unit}</Text>
          {showTrend && <Text style={[styles.valueTableText, isDark && styles.textDark]}>{point.trend?.toFixed(1) ?? '—'} {unit}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme, colorScheme } = useAppTheme();
  const [range, setRange] = useState<RangeDays>(90);
  const [measurementType, setMeasurementType] = useState('Waist');
  const [data, setData] = useState<ProgressData>(defaultData);
  const [selectedWeightTimestamp, setSelectedWeightTimestamp] = useState<number | null>(null);
  const [selectedMeasurementTimestamp, setSelectedMeasurementTimestamp] = useState<number | null>(null);
  const [weightDisplayMode, setWeightDisplayMode] = useState<AnalyticsDisplayMode>('chart');
  const [measurementDisplayMode, setMeasurementDisplayMode] = useState<AnalyticsDisplayMode>('chart');
  const [macroDisplayMode, setMacroDisplayMode] = useState<AnalyticsDisplayMode>('chart');
  const [isUsingDemoData, setIsUsingDemoData] = useState(false);
  const [progressGoal, setProgressGoal] = usePersistedState<ProgressGoal>(STORAGE_KEYS.PROGRESS_GOAL, { targetWeight: '', targetDate: '' });

  const loadProgress = useCallback(async () => {
    const [foods, weights, measurements, contexts, goals, bodyStats] = await Promise.all([
      storage.get<NutritionEntry[]>(STORAGE_KEYS.FOOD_ENTRIES, []),
      storage.get<WeightEntry[]>(STORAGE_KEYS.WEIGHT_HISTORY, []),
      storage.get<MeasurementEntry[]>(STORAGE_KEYS.BODY_MEASUREMENTS, []),
      storage.get<DailyContextEntry[]>(STORAGE_KEYS.DAILY_CONTEXT, []),
      storage.get<Record<string, string | number>>(STORAGE_KEYS.MACRO_GOALS, {}),
      storage.get<BodyStats>(STORAGE_KEYS.BODY_STATS, {}),
    ]);
    setData({
      foods: foods ?? [],
      weights: weights ?? [],
      measurements: measurements ?? [],
      contexts: Array.isArray(contexts) ? contexts : [],
      goals: goals ?? {},
      heightCm: Number(bodyStats?.heightCm) || 0,
    });
  }, []);

  useFocusEffect(useCallback(() => {
    loadProgress();
  }, [loadProgress]));

  const activeData = isUsingDemoData ? demoAnalytics.data : data;
  const activeGoal = isUsingDemoData ? demoAnalytics.goal : progressGoal;
  const rangedWeights = useMemo(() => filterRange(activeData.weights, range), [activeData.weights, range]);
  const weightTrend = useMemo(() => buildWeightTrend(rangedWeights).slice(-20), [rangedWeights]);
  const projection = useMemo(() => forecastWeight(rangedWeights), [rangedWeights]);
  const macro = useMemo(() => calculateMacroAdherence(filterRange(activeData.foods, range), activeData.goals as any), [activeData.foods, activeData.goals, range]);
  const adaptiveGuidance = useMemo(() => estimateAdaptiveGuidance(activeData.foods, activeData.weights, activeData.goals as any), [activeData.foods, activeData.goals, activeData.weights]);
  const types = useMemo(() => [...new Set(activeData.measurements.map((entry) => entry.type))], [activeData.measurements]);
  const selectedMeasurements = useMemo(
    () => filterRange(activeData.measurements.filter((entry) => entry.type === measurementType), range)
      .map((entry) => ({ ...entry, value: Number(entry.value) }))
      .filter((entry) => Number.isFinite(entry.value)),
    [activeData.measurements, measurementType, range]
  );
  const waist = latestMeasurementByType(activeData.measurements, 'Waist');
  const waistToHeight = waist ? calculateWaistToHeight(Number(waist.value), activeData.heightCm) : null;
  const dataQuality = useMemo(
    () => calculateDataQuality(filterRange(activeData.foods, range), rangedWeights, filterRange(activeData.measurements, range), range),
    [activeData.foods, activeData.measurements, rangedWeights, range]
  );
  const targetWeight = Number(activeGoal.targetWeight);
  const targetDate = new Date(activeGoal.targetDate);
  const goalDaysAway = !Number.isNaN(targetDate.getTime()) ? Math.ceil((targetDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 0;
  const goalProjection = targetWeight > 0 && goalDaysAway > 0 ? forecastWeight(activeData.weights, goalDaysAway) : null;
  const goalPace = targetWeight > 0 && goalDaysAway > 0 ? calculateGoalPace(activeData.weights, targetWeight, targetDate) : null;
  const periodComparison = useMemo(() => compareNutritionPeriods(activeData.foods, range), [activeData.foods, range]);
  const measurementChange = useMemo(() => calculateMeasurementChange(selectedMeasurements, measurementType), [selectedMeasurements, measurementType]);
  const contextSummary = useMemo(() => summarizeDailyContext(filterRange(activeData.contexts, range)), [activeData.contexts, range]);
  const selectedWeight = weightTrend.find((point) => point.timestamp === selectedWeightTimestamp);
  const selectedMeasurement = selectedMeasurements.find((point) => point.timestamp === selectedMeasurementTimestamp);

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

      <View style={[styles.demoCard, isDark && styles.demoCardDark]}>
        <View style={styles.demoCopy}>
          <Text style={[styles.demoTitle, isDark && styles.textDark]}>{isUsingDemoData ? 'Demo analytics active' : 'Try the analytics'}</Text>
          <Text style={[styles.demoDescription, isDark && styles.mutedDark]}>
            {isUsingDemoData ? 'Showing 42 days of simulated local data. Your saved logs have not changed.' : 'Load a simulated 42-day dataset to explore charts, values, forecasts, and comparisons.'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsUsingDemoData((current) => !current)}
          style={[styles.demoButton, isUsingDemoData && styles.demoButtonActive]}>
          <Text style={styles.demoButtonText}>{isUsingDemoData ? 'Use my data' : 'Load demo'}</Text>
        </Pressable>
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
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, isDark && styles.textDark]}>Weight trend</Text>
          <AnalyticsToggle mode={weightDisplayMode} onChange={setWeightDisplayMode} isDark={isDark} />
        </View>
        <Text style={[styles.description, isDark && styles.mutedDark]}>Open circles are weigh-ins; solid points show your 7-day rolling average.</Text>
        {weightDisplayMode === 'chart' ? (
          <TrendChart
            points={weightTrend}
            color="#2563eb"
            unit=" kg"
            isDark={isDark}
            selectedTimestamp={selectedWeightTimestamp}
            onPointSelect={(point) => setSelectedWeightTimestamp(point.timestamp)}
          />
        ) : (
          <ValueTable
            points={weightTrend}
            unit="kg"
            isDark={isDark}
            selectedTimestamp={selectedWeightTimestamp}
            onSelect={(point) => setSelectedWeightTimestamp(point.timestamp)}
            showTrend
          />
        )}
        {selectedWeight && weightDisplayMode === 'chart' && (
          <Text style={[styles.pointDetail, isDark && styles.mutedDark]}>
            {new Date(selectedWeight.timestamp).toLocaleDateString()}: {selectedWeight.value.toFixed(1)} kg, 7-day average {selectedWeight.trend.toFixed(1)} kg.
          </Text>
        )}
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
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>Weight goal</Text>
        <Text style={[styles.description, isDark && styles.mutedDark]}>Set a target to compare it with your current trend. Estimates are informational, not medical advice.</Text>
        <View style={styles.goalInputRow}>
          <View style={styles.goalInputGroup}>
            <Text style={[styles.goalLabel, isDark && styles.mutedDark]}>Target weight (kg)</Text>
            <TextInput
              style={[styles.goalInput, isDark && styles.goalInputDark]}
              value={activeGoal.targetWeight}
              onChangeText={(nextWeight) => setProgressGoal({ ...progressGoal, targetWeight: nextWeight })}
              editable={!isUsingDemoData}
              keyboardType="decimal-pad"
              placeholder="70"
              placeholderTextColor={isDark ? '#666' : '#999'}
            />
          </View>
          <View style={styles.goalInputGroup}>
            <Text style={[styles.goalLabel, isDark && styles.mutedDark]}>Target date</Text>
            <TextInput
              style={[styles.goalInput, isDark && styles.goalInputDark]}
              value={activeGoal.targetDate}
              onChangeText={(nextDate) => setProgressGoal({ ...progressGoal, targetDate: nextDate })}
              editable={!isUsingDemoData}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={isDark ? '#666' : '#999'}
            />
          </View>
        </View>
        {goalProjection ? (
          <Text style={[styles.helpText, isDark && styles.mutedDark]}>
            At your current trend, the estimated weight on this date is {goalProjection.projectedWeight.toFixed(1)} kg. Your target is {Math.abs(goalProjection.projectedWeight - targetWeight).toFixed(1)} kg away from that estimate.
          </Text>
        ) : (
          <Text style={[styles.helpText, isDark && styles.mutedDark]}>Enter a future ISO date and log at least 7 weigh-ins to compare your trajectory.</Text>
        )}
        {goalPace && (
          <Text style={[styles.helpText, isDark && styles.mutedDark]}>
            Pace: {goalPace.status.replace('-', ' ')}. Your trend is {goalPace.currentWeeklyRateKg.toFixed(2)} kg/week; this goal needs {goalPace.requiredWeeklyRateKg.toFixed(2)} kg/week.
          </Text>
        )}
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, isDark && styles.textDark]}>Macro adherence</Text>
          <AnalyticsToggle mode={macroDisplayMode} onChange={setMacroDisplayMode} isDark={isDark} chartLabel="Bars" />
        </View>
        <Text style={[styles.description, isDark && styles.mutedDark]}>Average intake across days with food logged in the selected range.</Text>
        {macroDisplayMode === 'chart' ? (
          (['calories', 'protein', 'carbs', 'fat', 'fiber'] as const).map((key) => (
            <View key={key} style={styles.macroRow}>
              <Text style={[styles.macroName, isDark && styles.textDark]}>{key[0].toUpperCase() + key.slice(1)}</Text>
              <View style={[styles.macroTrack, isDark && styles.macroTrackDark]}>
                <View style={[styles.macroFill, { width: `${macro.adherence[key]}%` }]} />
              </View>
              <Text style={[styles.macroPercent, isDark && styles.mutedDark]}>{macro.adherence[key]}%</Text>
            </View>
          ))
        ) : (
          (['calories', 'protein', 'carbs', 'fat', 'fiber'] as const).map((key) => (
            <View key={key} style={styles.valueRow}>
              <Text style={[styles.macroName, isDark && styles.textDark]}>{key[0].toUpperCase() + key.slice(1)}</Text>
              <Text style={[styles.valueRowText, isDark && styles.textDark]}>{Math.round(macro.average[key])} / {Number(activeData.goals[key]) || 0} {key === 'calories' ? 'kcal' : 'g'}</Text>
              <Text style={[styles.macroPercent, isDark && styles.mutedDark]}>{macro.adherence[key]}%</Text>
            </View>
          ))
        )}
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>Nutrition change</Text>
        <Text style={[styles.description, isDark && styles.mutedDark]}>Average daily intake in this period compared with the previous {range} days.</Text>
        {periodComparison.previousLoggedDays > 0 ? (
          <View style={styles.comparisonGrid}>
            <View style={[styles.comparisonItem, isDark && styles.comparisonItemDark]}>
              <Text style={[styles.comparisonValue, isDark && styles.textDark]}>{periodComparison.calorieChange! >= 0 ? '+' : ''}{periodComparison.calorieChange} kcal</Text>
              <Text style={[styles.comparisonLabel, isDark && styles.mutedDark]}>Calories/day</Text>
            </View>
            <View style={[styles.comparisonItem, isDark && styles.comparisonItemDark]}>
              <Text style={[styles.comparisonValue, isDark && styles.textDark]}>{periodComparison.proteinChange! >= 0 ? '+' : ''}{periodComparison.proteinChange} g</Text>
              <Text style={[styles.comparisonLabel, isDark && styles.mutedDark]}>Protein/day</Text>
            </View>
            <View style={[styles.comparisonItem, isDark && styles.comparisonItemDark]}>
              <Text style={[styles.comparisonValue, isDark && styles.textDark]}>{periodComparison.fiberChange! >= 0 ? '+' : ''}{periodComparison.fiberChange} g</Text>
              <Text style={[styles.comparisonLabel, isDark && styles.mutedDark]}>Fiber/day</Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.helpText, isDark && styles.mutedDark]}>Log food across two periods to compare changes.</Text>
        )}
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

      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>Data quality</Text>
        <Text style={[styles.description, isDark && styles.mutedDark]}>
          {dataQuality.foodLoggedDays} food-log days, {dataQuality.weighIns} weigh-ins, and {dataQuality.measurementEntries} measurements in this range.
        </Text>
        <View style={[styles.macroTrack, isDark && styles.macroTrackDark]}>
          <View style={[styles.macroFill, { width: `${dataQuality.coveragePercent}%` }]} />
        </View>
        <Text style={[styles.helpText, isDark && styles.mutedDark]}>{dataQuality.coveragePercent}% of days include food data. More consistent logging improves trend confidence.</Text>
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, isDark && styles.textDark]}>Measurements</Text>
          <AnalyticsToggle mode={measurementDisplayMode} onChange={setMeasurementDisplayMode} isDark={isDark} />
        </View>
        {types.length > 0 ? (
          <>
            <View style={styles.measurementTypes}>
              {types.map((type) => (
                <Pressable key={type} style={[styles.measurementChip, isDark && styles.rangeButtonDark, measurementType === type && styles.rangeButtonActive]} onPress={() => setMeasurementType(type)}>
                  <Text style={[styles.rangeText, isDark && styles.textDark, measurementType === type && styles.rangeTextActive]}>{type}</Text>
                </Pressable>
              ))}
            </View>
            {measurementDisplayMode === 'chart' ? (
              <TrendChart
                points={selectedMeasurements}
                color="#16a34a"
                unit=" cm"
                isDark={isDark}
                selectedTimestamp={selectedMeasurementTimestamp}
                onPointSelect={(point) => setSelectedMeasurementTimestamp(point.timestamp)}
              />
            ) : (
              <ValueTable
                points={selectedMeasurements}
                unit="cm"
                isDark={isDark}
                selectedTimestamp={selectedMeasurementTimestamp}
                onSelect={(point) => setSelectedMeasurementTimestamp(point.timestamp)}
              />
            )}
            {selectedMeasurement && measurementDisplayMode === 'chart' && (
              <Text style={[styles.pointDetail, isDark && styles.mutedDark]}>
                {new Date(selectedMeasurement.timestamp).toLocaleDateString()}: {selectedMeasurement.value.toFixed(1)} cm.
              </Text>
            )}
            {measurementChange && (
              <Text style={[styles.helpText, isDark && styles.mutedDark]}>
                {measurementType} changed {measurementChange.change >= 0 ? '+' : ''}{measurementChange.change.toFixed(1)} cm over {measurementChange.daysBetween} days.
              </Text>
            )}
          </>
        ) : (
          <Text style={[styles.helpText, isDark && styles.mutedDark]}>Log circumference measurements to compare changes beyond the scale.</Text>
        )}
        {waistToHeight && (
          <Text style={[styles.helpText, isDark && styles.mutedDark]}>Waist-to-height ratio: {waistToHeight.toFixed(2)}. This is a screening measure, not a diagnosis.</Text>
        )}
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>Daily context summary</Text>
        {contextSummary.entries > 0 ? (
          <>
            <Text style={[styles.description, isDark && styles.mutedDark]}>
              {contextSummary.entries} context entries in this range{contextSummary.averageSleepHours ? `; average sleep ${contextSummary.averageSleepHours.toFixed(1)} hours.` : '.'}
            </Text>
            <View style={styles.comparisonGrid}>
              <View style={[styles.comparisonItem, isDark && styles.comparisonItemDark]}>
                <Text style={[styles.comparisonValue, isDark && styles.textDark]}>{contextSummary.highStressDays}</Text>
                <Text style={[styles.comparisonLabel, isDark && styles.mutedDark]}>High-stress days</Text>
              </View>
              <View style={[styles.comparisonItem, isDark && styles.comparisonItemDark]}>
                <Text style={[styles.comparisonValue, isDark && styles.textDark]}>{contextSummary.highHungerDays}</Text>
                <Text style={[styles.comparisonLabel, isDark && styles.mutedDark]}>High-hunger days</Text>
              </View>
              <View style={[styles.comparisonItem, isDark && styles.comparisonItemDark]}>
                <Text style={[styles.comparisonValue, isDark && styles.textDark]}>{contextSummary.uncomfortableDigestionDays}</Text>
                <Text style={[styles.comparisonLabel, isDark && styles.mutedDark]}>Digestive discomfort</Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={[styles.helpText, isDark && styles.mutedDark]}>Save daily context in Measurements to see it summarized here.</Text>
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
  demoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  demoCardDark: { backgroundColor: '#172554', borderColor: '#1d4ed8' },
  demoCopy: { flex: 1 },
  demoTitle: { color: '#1e3a8a', fontSize: 14, fontWeight: '700' },
  demoDescription: { marginTop: 3, color: '#475569', fontSize: 12, lineHeight: 17 },
  demoButton: { paddingVertical: 9, paddingHorizontal: 11, borderRadius: 8, backgroundColor: Palette.primary },
  demoButtonActive: { backgroundColor: '#475569' },
  demoButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
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
  pointDetail: { marginTop: 12, color: '#64748b', fontSize: 13 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  analyticsToggle: { flexDirection: 'row', padding: 2, borderRadius: 8, backgroundColor: '#e2e8f0' },
  analyticsToggleDark: { backgroundColor: '#262626' },
  analyticsToggleButton: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6 },
  analyticsToggleButtonActive: { backgroundColor: Palette.primary },
  analyticsToggleText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  analyticsToggleTextDark: { color: '#cbd5e1' },
  analyticsToggleTextActive: { color: '#fff' },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  valueRowText: { flex: 1, color: '#334155', fontSize: 13, textAlign: 'right' },
  valueTable: { marginTop: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10 },
  valueTableDark: { borderColor: '#3f3f46' },
  valueTableHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f8fafc' },
  valueTableHeaderText: { flex: 1, color: '#64748b', fontSize: 11, fontWeight: '700' },
  valueTableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  valueTableRowSelected: { backgroundColor: '#dbeafe' },
  valueTableText: { flex: 1, color: '#334155', fontSize: 12 },
  comparisonGrid: { flexDirection: 'row', gap: 8 },
  comparisonItem: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#e2e8f0' },
  comparisonItemDark: { backgroundColor: '#1e293b' },
  comparisonValue: { color: '#111827', fontSize: 16, fontWeight: '700' },
  comparisonLabel: { marginTop: 4, color: '#64748b', fontSize: 11, lineHeight: 14 },
  goalInputRow: { flexDirection: 'row', gap: 12 },
  goalInputGroup: { flex: 1 },
  goalLabel: { marginBottom: 6, color: '#64748b', fontSize: 13, fontWeight: '600' },
  goalInput: { minWidth: 0, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff', color: '#111827' },
  goalInputDark: { backgroundColor: '#262626', borderColor: '#444', color: '#f5f5f5' },
  textDark: { color: '#f5f5f5' },
  mutedDark: { color: '#a3a3a3' },
});
