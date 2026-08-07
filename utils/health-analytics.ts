export interface NutritionEntry {
  timestamp: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface WeightEntry {
  timestamp: number;
  weight: string | number;
}

export interface MeasurementEntry {
  timestamp: number;
  type: string;
  value: string | number;
}

export interface MacroGoals {
  calories: number | string;
  protein: number | string;
  carbs: number | string;
  fat: number | string;
  fiber?: number | string;
}

export interface DailyNutrition {
  date: string;
  timestamp: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  entries: number;
}

export interface TrendPoint {
  timestamp: number;
  value: number;
  trend: number;
}

export interface WeightForecast {
  weeklyRateKg: number;
  projectedWeight: number;
  lowerBound: number;
  upperBound: number;
  confidence: 'Low' | 'Moderate' | 'High';
  sampleSize: number;
}

export interface AdaptiveGuidance {
  maintenanceCalories: number;
  suggestedCalories: number;
  confidence: 'Low' | 'Moderate' | 'High';
  message: string;
}

export interface DataQuality {
  foodLoggedDays: number;
  weighIns: number;
  measurementEntries: number;
  coveragePercent: number;
}

export interface DailyContextEntry {
  timestamp: number;
  sleepHours?: string | number;
  hunger?: 'Low' | 'Moderate' | 'High';
  stress?: 'Low' | 'Moderate' | 'High';
  digestion?: 'Comfortable' | 'Mixed' | 'Uncomfortable';
  note?: string;
}

export interface PeriodComparison {
  currentLoggedDays: number;
  previousLoggedDays: number;
  calorieChange: number | null;
  proteinChange: number | null;
  fiberChange: number | null;
}

export interface GoalPace {
  requiredWeeklyRateKg: number;
  currentWeeklyRateKg: number;
  status: 'ahead' | 'on-track' | 'behind';
}

export interface MeasurementChange {
  change: number;
  daysBetween: number;
  firstValue: number;
  latestValue: number;
}

export interface ContextSummary {
  entries: number;
  averageSleepHours: number | null;
  highStressDays: number;
  highHungerDays: number;
  uncomfortableDigestionDays: number;
}

const dayMilliseconds = 24 * 60 * 60 * 1000;

export const startOfDay = (timestamp: number) => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const dateKey = (timestamp: number) => new Date(timestamp).toLocaleDateString('en-CA');

const toNumber = (value: string | number | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const groupNutritionByDay = (entries: NutritionEntry[]): DailyNutrition[] => {
  const days = new Map<number, DailyNutrition>();

  entries.forEach((entry) => {
    const timestamp = startOfDay(entry.timestamp);
    const existing = days.get(timestamp) ?? {
      date: dateKey(timestamp),
      timestamp,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      entries: 0,
    };
    existing.calories += toNumber(entry.calories);
    existing.protein += toNumber(entry.protein);
    existing.carbs += toNumber(entry.carbs);
    existing.fat += toNumber(entry.fat);
    existing.fiber += toNumber(entry.fiber);
    existing.entries += 1;
    days.set(timestamp, existing);
  });

  return [...days.values()].sort((a, b) => a.timestamp - b.timestamp);
};

export const calculateMacroAdherence = (entries: NutritionEntry[], goals: MacroGoals) => {
  const days = groupNutritionByDay(entries);
  const loggedDays = days.length;
  const averages = days.reduce(
    (total, day) => ({
      calories: total.calories + day.calories,
      protein: total.protein + day.protein,
      carbs: total.carbs + day.carbs,
      fat: total.fat + day.fat,
      fiber: total.fiber + day.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
  const average = Object.fromEntries(
    Object.entries(averages).map(([key, value]) => [key, loggedDays ? value / loggedDays : 0])
  ) as Record<keyof typeof averages, number>;
  const goalValues = {
    calories: toNumber(goals.calories),
    protein: toNumber(goals.protein),
    carbs: toNumber(goals.carbs),
    fat: toNumber(goals.fat),
    fiber: toNumber(goals.fiber),
  };
  const adherence = Object.fromEntries(
    Object.entries(goalValues).map(([key, goal]) => [
      key,
      goal > 0 ? Math.min(100, Math.round((average[key as keyof typeof average] / goal) * 100)) : 0,
    ])
  ) as Record<keyof typeof goalValues, number>;

  return { days, loggedDays, average, adherence };
};

export const buildWeightTrend = (entries: WeightEntry[], windowDays = 7): TrendPoint[] => {
  const weights = entries
    .map((entry) => ({ timestamp: startOfDay(entry.timestamp), value: toNumber(entry.weight) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  return weights.map((point) => {
    const start = point.timestamp - (windowDays - 1) * dayMilliseconds;
    const values = weights.filter((entry) => entry.timestamp >= start && entry.timestamp <= point.timestamp);
    return {
      ...point,
      trend: values.reduce((total, entry) => total + entry.value, 0) / values.length,
    };
  });
};

export const linearRegression = (points: Array<{ timestamp: number; value: number }>) => {
  if (points.length < 2) return null;
  const origin = points[0].timestamp;
  const xs = points.map((point) => (point.timestamp - origin) / dayMilliseconds);
  const meanX = xs.reduce((total, value) => total + value, 0) / xs.length;
  const meanY = points.reduce((total, point) => total + point.value, 0) / points.length;
  const denominator = xs.reduce((total, value) => total + (value - meanX) ** 2, 0);
  if (denominator === 0) return null;
  const slope = points.reduce((total, point, index) => total + (xs[index] - meanX) * (point.value - meanY), 0) / denominator;
  const intercept = meanY - slope * meanX;
  const residuals = points.map((point, index) => point.value - (intercept + slope * xs[index]));
  const standardError = Math.sqrt(residuals.reduce((total, value) => total + value ** 2, 0) / Math.max(1, points.length - 2));
  return { slope, intercept, standardError, origin };
};

export const forecastWeight = (entries: WeightEntry[], daysAhead = 28): WeightForecast | null => {
  const trend = buildWeightTrend(entries).slice(-28);
  const regression = linearRegression(trend.map(({ timestamp, trend: value }) => ({ timestamp, value })));
  if (!regression || trend.length < 7) return null;

  const latest = trend[trend.length - 1];
  const projectedWeight = latest.trend + regression.slope * daysAhead;
  const uncertainty = Math.max(0.2, regression.standardError * (1 + daysAhead / 28));
  const confidence = trend.length >= 21 ? 'High' : trend.length >= 14 ? 'Moderate' : 'Low';
  return {
    weeklyRateKg: regression.slope * 7,
    projectedWeight,
    lowerBound: projectedWeight - uncertainty,
    upperBound: projectedWeight + uncertainty,
    confidence,
    sampleSize: trend.length,
  };
};

export const estimateAdaptiveGuidance = (
  entries: NutritionEntry[],
  weights: WeightEntry[],
  goals: MacroGoals
): AdaptiveGuidance | null => {
  const nutrition = calculateMacroAdherence(entries, goals);
  const forecast = forecastWeight(weights, 7);
  if (nutrition.loggedDays < 14 || !forecast || forecast.sampleSize < 14) return null;

  const averageCalories = nutrition.average.calories;
  const dailyEnergyGap = forecast.weeklyRateKg * 7700 / 7;
  const maintenanceCalories = Math.round(averageCalories + dailyEnergyGap);
  const targetCalories = toNumber(goals.calories);
  const difference = Math.round(targetCalories - (maintenanceCalories - 300));
  const suggestedCalories = Math.round(targetCalories - Math.max(-150, Math.min(150, difference)));
  const confidence = nutrition.loggedDays >= 21 && forecast.sampleSize >= 21 ? 'High' : 'Moderate';
  const direction = forecast.weeklyRateKg < -0.1 ? 'decreasing' : forecast.weeklyRateKg > 0.1 ? 'increasing' : 'stable';

  return {
    maintenanceCalories,
    suggestedCalories,
    confidence,
    message: `Your 28-day weight trend is ${direction}. This estimate uses your logged intake and trend, not a diagnosis.`,
  };
};

export const latestMeasurementByType = (entries: MeasurementEntry[], type: string) =>
  entries
    .filter((entry) => entry.type === type && toNumber(entry.value) > 0)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

export const calculateWaistToHeight = (waistCm: number, heightCm: number) =>
  heightCm > 0 && waistCm > 0 ? waistCm / heightCm : null;

export const calculateDataQuality = (
  foodEntries: NutritionEntry[],
  weightEntries: WeightEntry[],
  measurementEntries: MeasurementEntry[],
  rangeDays: number
): DataQuality => {
  const foodLoggedDays = groupNutritionByDay(foodEntries).length;
  const coveragePercent = Math.min(100, Math.round((foodLoggedDays / rangeDays) * 100));
  return {
    foodLoggedDays,
    weighIns: weightEntries.filter((entry) => toNumber(entry.weight) > 0).length,
    measurementEntries: measurementEntries.filter((entry) => toNumber(entry.value) > 0).length,
    coveragePercent,
  };
};

export const compareNutritionPeriods = (entries: NutritionEntry[], rangeDays: number): PeriodComparison => {
  const now = startOfDay(Date.now());
  const currentStart = now - (rangeDays - 1) * dayMilliseconds;
  const previousStart = currentStart - rangeDays * dayMilliseconds;
  const current = entries.filter((entry) => entry.timestamp >= currentStart && entry.timestamp <= now + dayMilliseconds);
  const previous = entries.filter((entry) => entry.timestamp >= previousStart && entry.timestamp < currentStart);
  const currentSummary = calculateMacroAdherence(current, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  const previousSummary = calculateMacroAdherence(previous, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  const change = (currentValue: number, previousValue: number) => previousSummary.loggedDays > 0 ? Math.round(currentValue - previousValue) : null;

  return {
    currentLoggedDays: currentSummary.loggedDays,
    previousLoggedDays: previousSummary.loggedDays,
    calorieChange: change(currentSummary.average.calories, previousSummary.average.calories),
    proteinChange: change(currentSummary.average.protein, previousSummary.average.protein),
    fiberChange: change(currentSummary.average.fiber, previousSummary.average.fiber),
  };
};

export const calculateGoalPace = (
  weights: WeightEntry[],
  targetWeight: number,
  targetDate: Date
): GoalPace | null => {
  const trend = buildWeightTrend(weights);
  const forecast = forecastWeight(weights, 7);
  const daysRemaining = Math.ceil((targetDate.getTime() - Date.now()) / dayMilliseconds);
  if (!forecast || trend.length === 0 || !Number.isFinite(targetWeight) || daysRemaining <= 0) return null;

  const requiredWeeklyRateKg = (targetWeight - trend[trend.length - 1].trend) * 7 / daysRemaining;
  const difference = forecast.weeklyRateKg - requiredWeeklyRateKg;
  const directionAligned = requiredWeeklyRateKg === 0 || Math.sign(forecast.weeklyRateKg) === Math.sign(requiredWeeklyRateKg);
  const status = directionAligned && Math.abs(difference) <= 0.08
    ? 'on-track'
    : Math.abs(forecast.weeklyRateKg) >= Math.abs(requiredWeeklyRateKg)
      ? 'ahead'
      : 'behind';
  return { requiredWeeklyRateKg, currentWeeklyRateKg: forecast.weeklyRateKg, status };
};

export const calculateMeasurementChange = (entries: MeasurementEntry[], type: string): MeasurementChange | null => {
  const values = entries
    .filter((entry) => entry.type === type && toNumber(entry.value) > 0)
    .map((entry) => ({ timestamp: entry.timestamp, value: toNumber(entry.value) }))
    .sort((a, b) => a.timestamp - b.timestamp);
  if (values.length < 2) return null;
  const first = values[0];
  const latest = values[values.length - 1];
  return {
    change: latest.value - first.value,
    daysBetween: Math.max(1, Math.round((latest.timestamp - first.timestamp) / dayMilliseconds)),
    firstValue: first.value,
    latestValue: latest.value,
  };
};

export const summarizeDailyContext = (entries: DailyContextEntry[]): ContextSummary => {
  const validEntries = entries.filter((entry) => Number.isFinite(entry.timestamp));
  const sleepValues = validEntries.map((entry) => toNumber(entry.sleepHours)).filter((value) => value > 0);
  return {
    entries: validEntries.length,
    averageSleepHours: sleepValues.length ? sleepValues.reduce((total, value) => total + value, 0) / sleepValues.length : null,
    highStressDays: validEntries.filter((entry) => entry.stress === 'High').length,
    highHungerDays: validEntries.filter((entry) => entry.hunger === 'High').length,
    uncomfortableDigestionDays: validEntries.filter((entry) => entry.digestion === 'Uncomfortable').length,
  };
};
