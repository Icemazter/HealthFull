import { Palette } from '@/constants/theme';
import { useHistoryManager, usePersistedState } from '@/hooks/use-persisted-state';
import { feedback, validate } from '@/utils/feedback';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Goals {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  fatMethod?: 'weight' | 'calories';
}

interface WeightEntry {
  date: string;
  weight: string;
  timestamp: number;
}

interface GlucoseEntry {
  glucose: string;
  timestamp: number;
  context: 'Before Meal' | 'After Meal' | 'Fasting' | 'Random';
}

interface InsulinEntry {
  units: string;
  type: 'Rapid-Acting' | 'Long-Acting';
  timestamp: number;
  note?: string;
}

type Gender = 'Male' | 'Female';
type ActivityLevel = 'Sedentary' | 'Light' | 'Moderate' | 'Very Active' | 'Extremely Active';
type TrainingGoal = 'Lose Fat' | 'Maintain' | 'Gain Muscle';

interface BodyStats {
  heightCm: string;
  weightKg: string;
  age: string;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: TrainingGoal;
}

interface MacroCyclingDay {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
}

interface MacroCycling {
  enabled: boolean;
  workoutDay: MacroCyclingDay;
  restDay: MacroCyclingDay;
  todayType: 'workout' | 'rest' | 'default';
}

const DEFAULT_MACRO_CYCLING: MacroCycling = {
  enabled: false,
  workoutDay: { calories: '2300', protein: '170', carbs: '260', fat: '65', fiber: '30' },
  restDay: { calories: '1800', protein: '160', carbs: '170', fat: '65', fiber: '30' },
  todayType: 'default',
};

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = usePersistedState<'light' | 'dark' | null>(STORAGE_KEYS.DARK_MODE, null);
  const isDark = colorScheme === 'dark' || (colorScheme === null && systemColorScheme === 'dark');
  
  const [goals, setGoals] = usePersistedState<Goals>(
    STORAGE_KEYS.MACRO_GOALS,
    { calories: '2000', protein: '150', carbs: '200', fat: '65', fiber: '30', fatMethod: 'calories' }
  );
  const [stats, setStats] = usePersistedState<BodyStats>(STORAGE_KEYS.BODY_STATS, {
    heightCm: '175',
    weightKg: '75',
    age: '25',
    gender: 'Male',
    activityLevel: 'Moderate',
    goal: 'Maintain',
  });
  
  const [weight, setWeight] = useState('');
  const [showBodyStats, setShowBodyStats] = useState(false);
  const [diabetesMode, setDiabetesMode] = usePersistedState(STORAGE_KEYS.DIABETES_MODE, false);
  const [showDiabetes, setShowDiabetes] = useState(false);
  
  const [glucoseValue, setGlucoseValue] = useState('');
  const [glucoseContext, setGlucoseContext] = useState<'Before Meal' | 'After Meal' | 'Fasting' | 'Random'>('Random');
  const glucoseManager = useHistoryManager<GlucoseEntry>(STORAGE_KEYS.GLUCOSE_HISTORY);
  
  const [insulinUnits, setInsulinUnits] = useState('');
  const [insulinType, setInsulinType] = useState<'Rapid-Acting' | 'Long-Acting'>('Rapid-Acting');
  const [insulinNote, setInsulinNote] = useState('');
  const insulinManager = useHistoryManager<InsulinEntry>(STORAGE_KEYS.INSULIN_HISTORY);
  
  const weightManager = useHistoryManager<WeightEntry>(STORAGE_KEYS.WEIGHT_HISTORY);

  const [openAIKey, setOpenAIKey] = usePersistedState<string>(STORAGE_KEYS.OPENAI_API_KEY, '');
  const [macroCycling, setMacroCycling] = usePersistedState<MacroCycling>(
    STORAGE_KEYS.MACRO_CYCLING,
    DEFAULT_MACRO_CYCLING
  );
  const [showMacroCycling, setShowMacroCycling] = useState(false);

  // Dynamic TDEE: estimate from weight history + food log using regression
  const dynamicTDEE = useMemo(() => {
    const weights = weightManager.history.slice(0, 30);
    if (weights.length < 7) return null; // Need at least a week of data

    // Load food data synchronously isn't possible here, so we use a simpler
    // regression: weight change × 7700 kcal/kg over the period
    const sortedWeights = [...weights].sort((a, b) => a.timestamp - b.timestamp);
    const oldest = sortedWeights[0];
    const newest = sortedWeights[sortedWeights.length - 1];
    const deltaKg = parseFloat(newest.weight) - parseFloat(oldest.weight);
    const deltaDays = (newest.timestamp - oldest.timestamp) / (1000 * 60 * 60 * 24);
    if (deltaDays < 7) return null;

    // We need average calories to compute TDEE from weight change
    // TDEE = avg_intake - (deltaKg/days * 7700)
    // Since we can't get async data here, just expose weight change trend
    return {
      weightChangeKgPerWeek: (deltaKg / deltaDays) * 7,
      days: Math.round(deltaDays),
      deltaKg: parseFloat(deltaKg.toFixed(2)),
    };
  }, [weightManager.history]);

  useEffect(() => {
    // Backfill fiber for users with older saved goals
    if ((goals as any).fiber === undefined) {
      setGoals((prev) => ({ ...prev, fiber: '30' }));
    }
  }, [goals, setGoals]);

  useEffect(() => {
    // Update weight in stats when history changes
    const latest = weightManager.history[0];
    if (latest?.weight) {
      setStats((prev) => ({ ...prev, weightKg: latest.weight }));
    }
  }, [weightManager.history]);

  const toggleDiabetesMode = async () => {
    await setDiabetesMode(!diabetesMode);
    await feedback.selection();
  };

  const logGlucose = async () => {
    const { valid, parsed } = validate.number(glucoseValue);
    if (!valid) {
      return feedback.error('Please enter a valid glucose value.', 'Invalid Reading');
    }

    await glucoseManager.add({
      glucose: glucoseValue,
      timestamp: Date.now(),
      context: glucoseContext,
    });
    setGlucoseValue('');
    await feedback.success();
  };

  const logInsulin = async () => {
    const { valid, parsed } = validate.number(insulinUnits);
    if (!valid) {
      return feedback.error('Please enter valid insulin units.', 'Invalid Dose');
    }

    await insulinManager.add({
      units: insulinUnits,
      type: insulinType,
      timestamp: Date.now(),
      note: insulinNote || undefined,
    });
    setInsulinUnits('');
    setInsulinNote('');
    await feedback.success();
  };

  const recommendGoals = async () => {
    const height = parseFloat(stats.heightCm) || 0;
    const weightKg = parseFloat(stats.weightKg) || 0;
    const age = parseFloat(stats.age) || 0;
    
    if (height <= 0 || weightKg <= 0 || age <= 0) {
      return feedback.error('Enter height, weight, and age to get a suggestion.', 'Missing data');
    }

    // Mifflin-St Jeor equation for BMR (most accurate)
    let bmr: number;
    if (stats.gender === 'Male') {
      bmr = 10 * weightKg + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weightKg + 6.25 * height - 5 * age - 161;
    }

    // Activity multipliers (Harris-Benedict)
    const activityMultipliers: Record<ActivityLevel, number> = {
      'Sedentary': 1.2,
      'Light': 1.375,
      'Moderate': 1.55,
      'Very Active': 1.725,
      'Extremely Active': 1.9,
    };

    // Calculate TDEE
    const tdee = bmr * activityMultipliers[stats.activityLevel];

    // Adjust for goal
    let calories: number;
    if (stats.goal === 'Lose Fat') {
      calories = tdee - 500; // ~0.5kg/week loss
    } else if (stats.goal === 'Gain Muscle') {
      calories = tdee + 400; // ~0.5kg/week gain
    } else {
      calories = tdee;
    }

    // Protein: Jeff Nippard / sports nutrition research recommendations
    let proteinPerKg: number;
    if (stats.goal === 'Lose Fat') {
      // Cutting: 1.8-2.7 g/kg (0.8-1.2 g/lb) - use mid-high range
      proteinPerKg = 2.3;
    } else if (stats.goal === 'Gain Muscle') {
      // Bulking: 1.6-2.2 g/kg (0.7-1.0 g/lb) - use upper range
      proteinPerKg = 2.0;
    } else {
      // Maintenance/Recomp: 1.6-2.2 g/kg - use middle range
      proteinPerKg = 1.9;
    }

    const protein = Math.round(proteinPerKg * weightKg);
    
    // Fat: allow two methods - by weight (g/kg) or by calories (% of energy) with a minimum by weight
    const fatMethod = (goals && (goals as any).fatMethod) || 'calories';
    let fatGrams: number;
    if (fatMethod === 'weight') {
      // Preserve previous behavior when user prefers weight-based fat
      fatGrams = Math.round(0.9 * weightKg);
    } else {
      // Default: calculate as percent of total calories, but enforce a minimum per-kg floor
      const fatPercent = stats.goal === 'Gain Muscle' ? 0.30 : 0.25; // gain needs slightly more fat
      const fatCalories = Math.round(calories * fatPercent);
      const fatFromCalories = Math.round(fatCalories / 9);
      const minFatKg = Math.round(0.8 * weightKg); // minimum grams per kg
      fatGrams = Math.max(minFatKg, fatFromCalories);
    }

    // Carbs: remaining calories after protein and fat
    const carbCalories = calories - (protein * 4) - (fatGrams * 9);
    const carbs = Math.max(0, Math.round(carbCalories / 4));

    // Fiber: ~14g per 1000 kcal (Dietary Guidelines), clamp to a sensible range
    const fiber = Math.round(Math.min(Math.max((calories / 1000) * 14, 18), 45));

    const newGoals = {
      calories: Math.round(calories).toString(),
      protein: protein.toString(),
      carbs: carbs.toString(),
      fat: fatGrams.toString(),
      fiber: fiber.toString(),
    };
    
    await setGoals(newGoals);
    
    const message = 
      `📊 Calculations:\n` +
      `BMR: ${Math.round(bmr)} kcal\n` +
      `TDEE: ${Math.round(tdee)} kcal\n` +
      `Goal: ${stats.goal}\n\n` +
      `✅ Applied Goals:\n` +
      `🔥 Calories: ${Math.round(calories)} kcal\n` +
      `🥩 Protein: ${protein}g (${proteinPerKg}g/kg)\n` +
      `🍞 Carbs: ${carbs}g\n` +
      `🥑 Fat: ${fatGrams}g (${fatMethod === 'weight' ? 'by weight' : 'by calories'})\n` +
      `🥦 Fiber: ${fiber}g (~14g/1000 kcal)\n\n` +
      `Goals automatically saved to nutrition tracker!`;
    
    await feedback.success(message, '🎯 Goals Applied & Saved');
  };

  const saveGoals = async () => {
    // Use batch operation to save both in one write
    await storage.multiSet({
      [STORAGE_KEYS.MACRO_GOALS]: goals,
      [STORAGE_KEYS.BODY_STATS]: stats,
    });
    await feedback.success('Goals saved successfully!');
  };

  const applyMacroCyclingDay = async (type: 'workout' | 'rest') => {
    const dayGoals = type === 'workout' ? macroCycling.workoutDay : macroCycling.restDay;
    await setGoals({ ...goals, ...dayGoals });
    await setMacroCycling({ ...macroCycling, todayType: type });
    await feedback.success(`${type === 'workout' ? 'Workout' : 'Rest'} day targets applied!`);
  };

  const logWeight = async () => {
    const { valid } = validate.number(weight);
    if (!valid) {
      return feedback.error('Please enter a valid weight.', 'Invalid Weight');
    }

    await weightManager.add({
      date: new Date().toLocaleDateString(),
      weight: weight,
      timestamp: Date.now(),
    });
    setWeight('');
    await feedback.success();
  };

  const deleteWeightEntry = (timestamp: number) => {
    feedback.confirm('Delete Entry', 'Remove this weight entry?', () => {
      weightManager.remove(timestamp);
    });
  };

  const deleteGlucoseEntry = (timestamp: number) => {
    feedback.confirm('Delete Entry', 'Remove this glucose entry?', () => {
      glucoseManager.remove(timestamp);
    });
  };

  const deleteInsulinEntry = (timestamp: number) => {
    feedback.confirm('Delete Entry', 'Remove this insulin entry?', () => {
      insulinManager.remove(timestamp);
    });
  };

  return (
    <>
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: isDark ? '#0a0a0a' : Palette.white }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={[styles.headerTitle, isDark && styles.textDark]}>Goals & Settings</Text>
      </View>

      {/* Macro Goals */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>🎯 Daily Macro Goals</Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark && styles.labelDark]}>Calories (kcal)</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={goals.calories}
            onChangeText={(text) => setGoals({ ...goals, calories: text })}
            keyboardType="number-pad"
            placeholder="2000"
            placeholderTextColor={isDark ? '#666' : '#999'}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark && styles.labelDark]}>Protein (g)</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={goals.protein}
            onChangeText={(text) => setGoals({ ...goals, protein: text })}
            keyboardType="number-pad"
            placeholder="150"
            placeholderTextColor={isDark ? '#666' : '#999'}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark && styles.labelDark]}>Carbs (g)</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={goals.carbs}
            onChangeText={(text) => setGoals({ ...goals, carbs: text })}
            keyboardType="number-pad"
            placeholder="200"
            placeholderTextColor={isDark ? '#666' : '#999'}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark && styles.labelDark]}>Fat (g)</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={goals.fat}
            onChangeText={(text) => setGoals({ ...goals, fat: text })}
            keyboardType="number-pad"
            placeholder="65"
            placeholderTextColor={isDark ? '#666' : '#999'}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark && styles.labelDark]}>Fat Calculation</Text>
          <View style={styles.chipRow}>
            <Pressable
              style={[styles.chip, isDark && styles.chipDark, goals.fatMethod === 'weight' && styles.chipActive]}
              onPress={() => setGoals({ ...goals, fatMethod: 'weight' as const })}
            >
              <Text style={[styles.chipText, isDark && styles.chipTextDark, goals.fatMethod === 'weight' && styles.chipTextActive]}>By weight (g/kg)</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, isDark && styles.chipDark, goals.fatMethod === 'calories' && styles.chipActive]}
              onPress={() => setGoals({ ...goals, fatMethod: 'calories' as const })}
            >
              <Text style={[styles.chipText, isDark && styles.chipTextDark, goals.fatMethod === 'calories' && styles.chipTextActive]}>By calories (%)</Text>
            </Pressable>
          </View>
          <Text style={[styles.activityHint, isDark && styles.activityHintDark]}>
            Fat is calculated as % of energy (25% default, 30% when bulking) with a safe minimum of 0.8 g/kg to protect health. Switch to “By weight” if you prefer a fixed g/kg target.
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark && styles.labelDark]}>Fiber (g)</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={goals.fiber}
            onChangeText={(text) => setGoals({ ...goals, fiber: text })}
            keyboardType="number-pad"
            placeholder="30"
            placeholderTextColor={isDark ? '#666' : '#999'}
          />
        </View>

        <Pressable style={styles.saveButton} onPress={saveGoals}>
          <Text style={styles.saveButtonText}>💾 Save Goals</Text>
        </Pressable>
      </View>

      {/* Body Stats & Recommendation */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <View style={styles.bodyHeaderRow}>
          <Text style={[styles.cardTitle, isDark && styles.textDark]}>📏 Body Stats</Text>
          <Pressable style={[styles.toggleButton, isDark && styles.toggleButtonDark]} onPress={() => setShowBodyStats(!showBodyStats)}>
            <Text style={[styles.toggleButtonText, isDark && styles.toggleButtonTextDark]}>{showBodyStats ? 'Hide' : 'Show'}</Text>
          </Pressable>
        </View>

        {showBodyStats && (
          <>
            <View style={styles.inlineRow}>
              <View style={[styles.inputGroup, styles.inlineThird]}>
                <Text style={[styles.label, isDark && styles.labelDark]}>Height (cm)</Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={stats.heightCm}
                  onChangeText={(text) => setStats({ ...stats, heightCm: text })}
                  keyboardType="decimal-pad"
                  placeholder="175"
                  placeholderTextColor={isDark ? '#666' : '#999'}
                />
              </View>
              <View style={[styles.inputGroup, styles.inlineThird]}>
                <Text style={[styles.label, isDark && styles.labelDark]}>Weight (kg)</Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={stats.weightKg}
                  onChangeText={(text) => setStats({ ...stats, weightKg: text })}
                  keyboardType="decimal-pad"
                  placeholder="75"
                  placeholderTextColor={isDark ? '#666' : '#999'}
                />
              </View>
              <View style={[styles.inputGroup, styles.inlineThird]}>
                <Text style={[styles.label, isDark && styles.labelDark]}>Age</Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={stats.age}
                  onChangeText={(text) => setStats({ ...stats, age: text })}
                  keyboardType="number-pad"
                  placeholder="25"
                  placeholderTextColor={isDark ? '#666' : '#999'}
                />
              </View>
            </View>

            <View style={styles.chipGroup}>
              <Text style={[styles.label, isDark && styles.labelDark]}>Gender</Text>
              <View style={styles.chipRow}>
                {(['Male', 'Female'] as const).map((g) => (
                  <Pressable
                    key={g}
                    style={[styles.chip, isDark && styles.chipDark, stats.gender === g && styles.chipActive]}
                    onPress={() => setStats({ ...stats, gender: g })}>
                    <Text style={[styles.chipText, isDark && styles.chipTextDark, stats.gender === g && styles.chipTextActive]}>{g}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.chipGroup}>
              <Text style={[styles.label, isDark && styles.labelDark]}>Activity Level</Text>
              <Text style={[styles.activityHint, isDark && styles.activityHintDark]}>
                <Text style={[styles.boldHint, isDark && styles.boldHintDark]}>Sedentary:</Text> Little/no exercise, desk job{'\n'}
                <Text style={[styles.boldHint, isDark && styles.boldHintDark]}>Light:</Text> Exercise 1-3 days/week{'\n'}
                <Text style={[styles.boldHint, isDark && styles.boldHintDark]}>Moderate:</Text> Exercise 3-5 days/week{'\n'}
                <Text style={[styles.boldHint, isDark && styles.boldHintDark]}>Very Active:</Text> Exercise 6-7 days/week{'\n'}
                <Text style={[styles.boldHint, isDark && styles.boldHintDark]}>Extremely Active:</Text> Physical job + daily training
              </Text>
              <View style={styles.chipRow}>
                {(['Sedentary', 'Light', 'Moderate', 'Very Active', 'Extremely Active'] as const).map((a) => (
                  <Pressable
                    key={a}
                    style={[styles.chip, isDark && styles.chipDark, stats.activityLevel === a && styles.chipActive]}
                    onPress={() => setStats({ ...stats, activityLevel: a })}>
                    <Text style={[styles.chipText, isDark && styles.chipTextDark, stats.activityLevel === a && styles.chipTextActive]}>{a}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.chipGroup}>
              <Text style={[styles.label, isDark && styles.labelDark]}>Training Goal</Text>
              <View style={styles.chipRow}>
                {(['Lose Fat', 'Maintain', 'Gain Muscle'] as const).map((g) => (
                  <Pressable
                    key={g}
                    style={[styles.chip, isDark && styles.chipDark, stats.goal === g && styles.chipActive]}
                    onPress={() => setStats({ ...stats, goal: g })}>
                    <Text style={[styles.chipText, isDark && styles.chipTextDark, stats.goal === g && styles.chipTextActive]}>{g}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable style={styles.suggestButton} onPress={recommendGoals}>
              <Text style={styles.suggestButtonText}>✨ Apply Suggested Goals</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Body Weight Tracking */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>⚖️ Body Weight</Text>
        
        <View style={styles.weightInputRow}>
          <TextInput
            style={[styles.weightInput, isDark && styles.weightInputDark]}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="75.5"
            placeholderTextColor={isDark ? '#666' : '#999'}
          />
          <Text style={[styles.weightUnit, isDark && styles.weightUnitDark]}>kg</Text>
          <Pressable style={styles.logButton} onPress={logWeight}>
            <Text style={styles.logButtonText}>Log</Text>
          </Pressable>
        </View>

        {weightManager.history.length > 0 && (
          <View style={styles.weightHistory}>
            <Text style={[styles.historyTitle, isDark && styles.historyTitleDark]}>Recent Entries</Text>
            {weightManager.history.slice(0, 10).map((entry) => (
              <View key={entry.timestamp} style={[styles.weightEntry, isDark && styles.weightEntryDark]}>
                <View>
                  <Text style={styles.weightValue}>{entry.weight} kg</Text>
                  <Text style={[styles.weightDate, isDark && styles.historyTimeDark]}>{entry.date}</Text>
                </View>
                <Pressable onPress={() => deleteWeightEntry(entry.timestamp)}>
                  <Text style={styles.deleteButton}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Dark Mode */}
      <View style={[styles.card, isDark && styles.cardDark]}>
      </View>

      {/* Dynamic TDEE insight */}
      {dynamicTDEE && (
        <View style={[styles.card, isDark && styles.cardDark]}>
          <Text style={[styles.cardTitle, isDark && styles.textDark]}>📊 Dynamic TDEE Insight</Text>
          <Text style={[styles.label, isDark && styles.labelDark]}>
            Based on {dynamicTDEE.days} days of weight data:
          </Text>
          <View style={[styles.tdeeRow]}>
            <View style={styles.tdeeBox}>
              <Text style={[styles.tdeeValue, { color: dynamicTDEE.weightChangeKgPerWeek < -0.1 ? Palette.success : dynamicTDEE.weightChangeKgPerWeek > 0.1 ? Palette.error : Palette.primary }]}>
                {dynamicTDEE.weightChangeKgPerWeek > 0 ? '+' : ''}{dynamicTDEE.weightChangeKgPerWeek.toFixed(2)} kg/wk
              </Text>
              <Text style={[styles.tdeeLabel, isDark && styles.labelDark]}>Weight Change</Text>
            </View>
            <View style={styles.tdeeBox}>
              <Text style={[styles.tdeeValue, { color: Palette.primary }]}>
                {dynamicTDEE.deltaKg > 0 ? '+' : ''}{dynamicTDEE.deltaKg} kg
              </Text>
              <Text style={[styles.tdeeLabel, isDark && styles.labelDark]}>Total Change</Text>
            </View>
          </View>
          <Text style={[styles.tdeeHint, isDark && styles.labelDark]}>
            {Math.abs(dynamicTDEE.weightChangeKgPerWeek) < 0.1
              ? '✅ Your weight is stable — you\'re near energy balance.'
              : dynamicTDEE.weightChangeKgPerWeek < 0
              ? `📉 You\'re losing ~${Math.abs(dynamicTDEE.weightChangeKgPerWeek).toFixed(2)} kg/week. If this is faster than desired, increase your calorie goal.`
              : `📈 You\'re gaining ~${dynamicTDEE.weightChangeKgPerWeek.toFixed(2)} kg/week. If this is faster than desired, reduce your calorie goal.`}
          </Text>
        </View>
      )}

      {/* Macro Cycling */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <View style={styles.bodyHeaderRow}>
          <Text style={[styles.cardTitle, isDark && styles.textDark]}>🔄 Macro Cycling</Text>
          <Pressable
            style={[styles.toggleButton, isDark && styles.toggleButtonDark, macroCycling.enabled && styles.toggleButtonActive]}
            onPress={() => setMacroCycling({ ...macroCycling, enabled: !macroCycling.enabled })}>
            <Text style={[styles.toggleButtonText, isDark && styles.toggleButtonTextDark, macroCycling.enabled && { color: '#fff' }]}>
              {macroCycling.enabled ? 'On' : 'Off'}
            </Text>
          </Pressable>
        </View>

        {macroCycling.enabled && (
          <>
            <Text style={[styles.activityHint, isDark && styles.activityHintDark]}>
              Set different calorie/macro targets for workout vs. rest days. Tap a day type to instantly apply those targets to your active goals.
            </Text>

            <View style={styles.cyclingDayRow}>
              <Pressable
                style={[styles.cyclingDayBtn, macroCycling.todayType === 'workout' && styles.cyclingDayActive]}
                onPress={() => applyMacroCyclingDay('workout')}>
                <Text style={[styles.cyclingDayLabel, macroCycling.todayType === 'workout' && styles.cyclingDayLabelActive]}>💪 Workout Day</Text>
                <Text style={[styles.cyclingDayCals, isDark && styles.labelDark]}>{macroCycling.workoutDay.calories} kcal</Text>
                <Text style={[styles.cyclingDayMacros, isDark && styles.labelDark]}>P:{macroCycling.workoutDay.protein} C:{macroCycling.workoutDay.carbs} F:{macroCycling.workoutDay.fat}</Text>
              </Pressable>
              <Pressable
                style={[styles.cyclingDayBtn, macroCycling.todayType === 'rest' && styles.cyclingDayActive]}
                onPress={() => applyMacroCyclingDay('rest')}>
                <Text style={[styles.cyclingDayLabel, macroCycling.todayType === 'rest' && styles.cyclingDayLabelActive]}>😴 Rest Day</Text>
                <Text style={[styles.cyclingDayCals, isDark && styles.labelDark]}>{macroCycling.restDay.calories} kcal</Text>
                <Text style={[styles.cyclingDayMacros, isDark && styles.labelDark]}>P:{macroCycling.restDay.protein} C:{macroCycling.restDay.carbs} F:{macroCycling.restDay.fat}</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.expandButton}
              onPress={() => setShowMacroCycling(!showMacroCycling)}>
              <Text style={[styles.expandButtonText, isDark && styles.textDark]}>
                {showMacroCycling ? '▼ Hide targets' : '▶ Edit targets'}
              </Text>
            </Pressable>

            {showMacroCycling && (
              <View style={styles.cyclingEditBox}>
                {(['workoutDay', 'restDay'] as const).map((dayType) => (
                  <View key={dayType} style={styles.cyclingEditSection}>
                    <Text style={[styles.label, isDark && styles.labelDark]}>
                      {dayType === 'workoutDay' ? '💪 Workout Day' : '😴 Rest Day'}
                    </Text>
                    {(['calories', 'protein', 'carbs', 'fat', 'fiber'] as const).map((macro) => (
                      <View key={macro} style={styles.inlineRow}>
                        <Text style={[styles.cyclingMacroLabel, isDark && styles.labelDark]}>
                          {macro.charAt(0).toUpperCase() + macro.slice(1)}
                        </Text>
                        <TextInput
                          style={[styles.cyclingInput, isDark && styles.inputDark]}
                          value={macroCycling[dayType][macro]}
                          onChangeText={(v) =>
                            setMacroCycling({
                              ...macroCycling,
                              [dayType]: { ...macroCycling[dayType], [macro]: v },
                            })
                          }
                          keyboardType="number-pad"
                          placeholder="0"
                          placeholderTextColor={isDark ? '#666' : '#999'}
                        />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      {/* AI Settings */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>🤖 AI Settings</Text>
        <Text style={[styles.activityHint, isDark && styles.activityHintDark]}>
          Enter your OpenAI API key to enable AI food logging, photo analysis, and smart macro suggestions. Your key is stored locally and never shared.
        </Text>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark && styles.labelDark]}>OpenAI API Key</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={openAIKey}
            onChangeText={setOpenAIKey}
            placeholder="sk-..."
            placeholderTextColor={isDark ? '#666' : '#999'}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {openAIKey ? (
          <Text style={[styles.apiKeyStatus, { color: Palette.success }]}>✅ API key saved</Text>
        ) : (
          <Text style={[styles.apiKeyStatus, { color: Palette.gray }]}>
            Get a key at platform.openai.com
          </Text>
        )}
      </View>

      {/* Diabetes Management */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <View style={styles.bodyHeaderRow}>
          <Text style={[styles.cardTitle, isDark && styles.textDark]}>💉 Diabetes Management</Text>
          <Pressable style={[styles.toggleButtonCircle, isDark && styles.toggleButtonDark, diabetesMode && styles.toggleButtonActive]} onPress={toggleDiabetesMode}>
            <View style={[styles.circleIndicator, diabetesMode && styles.circleIndicatorFilled]} />
          </Pressable>
        </View>

        {diabetesMode && (
          <View style={styles.diabetesContainer}>
            <Pressable style={styles.expandButton} onPress={() => setShowDiabetes(!showDiabetes)}>
              <Text style={[styles.expandButtonText, isDark && styles.textDark]}>
                {showDiabetes ? '▼ Hide Tracking' : '▶ Show Tracking'}
              </Text>
            </Pressable>

            {showDiabetes && (
              <View style={styles.diabetesContent}>
                {/* Blood Glucose Tracking */}
                <View style={[styles.diabetesSection, isDark && styles.diabetesSectionDark]}>
                  <Text style={[styles.diabetesSectionTitle, isDark && styles.diabetesSectionTitleDark]}>🩸 Blood Glucose (mg/dL)</Text>
                  
                  <View style={styles.chipGroup}>
                    <Text style={[styles.label, isDark && styles.labelDark]}>Context</Text>
                    <View style={styles.chipRow}>
                      {(['Before Meal', 'After Meal', 'Fasting', 'Random'] as const).map((ctx) => (
                        <Pressable
                          key={ctx}
                          style={[styles.chip, isDark && styles.chipDark, glucoseContext === ctx && styles.chipActive]}
                          onPress={() => setGlucoseContext(ctx)}>
                          <Text style={[styles.chipText, isDark && styles.chipTextDark, glucoseContext === ctx && styles.chipTextActive]}>{ctx}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.weightInputRow}>
                    <TextInput
                      style={[styles.weightInput, isDark && styles.weightInputDark]}
                      value={glucoseValue}
                      onChangeText={setGlucoseValue}
                      keyboardType="decimal-pad"
                      placeholder="120"
                      placeholderTextColor={isDark ? '#666' : '#999'}
                    />
                    <Text style={styles.weightUnit}>mg/dL</Text>
                    <Pressable style={styles.logButton} onPress={logGlucose}>
                      <Text style={styles.logButtonText}>Log</Text>
                    </Pressable>
                  </View>

                  {glucoseManager.history.length > 0 && (
                    <View style={styles.historyBox}>
                      <Text style={[styles.historyLabel, isDark && styles.historyLabelDark]}>Recent Readings</Text>
                      {glucoseManager.history.slice(0, 5).map((entry) => (
                        <View key={entry.timestamp} style={[styles.historyEntry, isDark && styles.historyEntryDark]}>
                          <View>
                            <Text style={styles.historyValue}>{entry.glucose} mg/dL</Text>
                            <Text style={[styles.historyContext, isDark && styles.historyContextDark]}>{entry.context}</Text>
                            <Text style={[styles.historyTime, isDark && styles.historyTimeDark]}>{new Date(entry.timestamp).toLocaleString()}</Text>
                          </View>
                          <Pressable onPress={() => deleteGlucoseEntry(entry.timestamp)}>
                            <Text style={styles.deleteButton}>✕</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Insulin Tracking */}
                <View style={[styles.diabetesSection, isDark && styles.diabetesSectionDark]}>
                  <Text style={[styles.diabetesSectionTitle, isDark && styles.diabetesSectionTitleDark]}>💉 Insulin Dose</Text>
                  
                  <View style={styles.chipGroup}>
                    <Text style={[styles.label, isDark && styles.labelDark]}>Type</Text>
                    <View style={styles.chipRow}>
                      {(['Rapid-Acting', 'Long-Acting'] as const).map((type) => (
                        <Pressable
                          key={type}
                          style={[styles.chip, isDark && styles.chipDark, insulinType === type && styles.chipActive]}
                          onPress={() => setInsulinType(type)}>
                          <Text style={[styles.chipText, isDark && styles.chipTextDark, insulinType === type && styles.chipTextActive]}>{type}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.weightInputRow}>
                    <TextInput
                      style={[styles.weightInput, isDark && styles.weightInputDark]}
                      value={insulinUnits}
                      onChangeText={setInsulinUnits}
                      keyboardType="decimal-pad"
                      placeholder="10"
                      placeholderTextColor={isDark ? '#666' : '#999'}
                    />
                    <Text style={[styles.weightUnit, isDark && styles.weightUnitDark]}>units</Text>
                    <Pressable style={styles.logButton} onPress={logInsulin}>
                      <Text style={styles.logButtonText}>Log</Text>
                    </Pressable>
                  </View>

                  <TextInput
                    style={[styles.noteInput, isDark && styles.noteInputDark]}
                    value={insulinNote}
                    onChangeText={setInsulinNote}
                    placeholder="Note (optional: meal, correction, etc.)"
                    placeholderTextColor={isDark ? '#666' : '#999'}
                  />

                  {insulinManager.history.length > 0 && (
                    <View style={styles.historyBox}>
                      <Text style={[styles.historyLabel, isDark && styles.historyLabelDark]}>Recent Doses</Text>
                      {insulinManager.history.slice(0, 5).map((entry) => (
                        <View key={entry.timestamp} style={[styles.historyEntry, isDark && styles.historyEntryDark]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.historyValue}>{entry.units} units - {entry.type}</Text>
                            {entry.note && <Text style={[styles.historyContext, isDark && styles.historyContextDark]}>{entry.note}</Text>}
                            <Text style={[styles.historyTime, isDark && styles.historyTimeDark]}>{new Date(entry.timestamp).toLocaleString()}</Text>
                          </View>
                          <Pressable onPress={() => deleteInsulinEntry(entry.timestamp)}>
                            <Text style={styles.deleteButton}>✕</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <Text style={[styles.diabetesNote, isDark && styles.diabetesNoteDark]}>
                  💡 Tip: Carbs are displayed prominently in food logs when diabetes mode is on. Track your glucose and insulin alongside meals for better management.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.white,
  },
  containerDark: {
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: Palette.lightGray,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerDark: {
    backgroundColor: '#1a1a1a',
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Palette.primary,
    flex: 1,
  },
  card: {
    margin: 16,
    padding: 20,
    backgroundColor: Palette.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  cardDark: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Palette.primary,
    marginBottom: 20,
  },
  textDark: {
    color: '#60a5fa',
  },
  textSecondaryDark: {
    color: '#9ca3af',
  },
  bodyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Palette.lightGray2,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    minWidth: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.lightGray2,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Palette.primary,
  },
  circleIndicatorFilled: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  toggleButtonDark: {
    backgroundColor: '#333',
    borderColor: '#444',
  },
  toggleButtonText: {
    color: Palette.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  toggleButtonTextDark: {
    color: '#60a5fa',
  },
  toggleButtonActive: {
    backgroundColor: Palette.primary,
  },
  toggleButtonTextActive: {
    color: Palette.white,
  },
  expandButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  expandButtonText: {
    color: Palette.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  diabetesContainer: {
    marginTop: 8,
  },
  diabetesContent: {
    marginTop: 8,
  },
  diabetesSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  diabetesSectionDark: {
    borderTopColor: '#333',
  },
  diabetesSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.darkGray,
    marginBottom: 20,
  },
  diabetesSectionTitleDark: {
    color: '#d1d5db',
  },
  historyBox: {
    marginTop: 24,
  },
  historyLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 12,
  },
  historyLabelDark: {
    color: '#d1d5db',
  },
  historyEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  historyEntryDark: {
    backgroundColor: '#262626',
    borderColor: '#404040',
  },
  historyValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.primary,
  },
  historyContext: {
    fontSize: 12,
    color: Palette.gray,
    marginTop: 2,
  },
  historyContextDark: {
    color: '#9ca3af',
  },
  historyTime: {
    fontSize: 11,
    color: Palette.gray,
    marginTop: 2,
  },
  historyTimeDark: {
    color: '#9ca3af',
  },
  noteInput: {
    backgroundColor: Palette.lightGray2,
    padding: 14,
    borderRadius: 8,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginTop: 16,
    marginBottom: 8,
  },
  noteInputDark: {
    backgroundColor: '#262626',
    borderColor: '#404040',
    color: '#e5e5e5',
  },
  diabetesNote: {
    fontSize: 12,
    color: Palette.gray,
    marginTop: 16,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  diabetesNoteDark: {
    color: '#9ca3af',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inlineHalf: {
    flex: 1,
  },
  inlineThird: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 8,
  },
  labelDark: {
    color: '#d1d5db',
  },
  input: {
    backgroundColor: Palette.lightGray2,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  inputDark: {
    backgroundColor: '#262626',
    borderColor: '#404040',
    color: '#e5e5e5',
  },
  saveButton: {
    backgroundColor: Palette.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: Palette.white,
    fontSize: 16,
    fontWeight: '600',
  },
  suggestButton: {
    backgroundColor: '#0ea5e9',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  suggestButtonText: {
    color: Palette.white,
    fontSize: 15,
    fontWeight: '700',
  },
  chipGroup: {
    marginTop: 12,
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: Palette.lightGray2,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  chipDark: {
    backgroundColor: '#333',
    borderColor: '#444',
  },
  chipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  chipText: {
    color: Palette.darkGray,
    fontWeight: '600',
    fontSize: 14,
  },
  chipTextDark: {
    color: '#d1d5db',
  },
  chipTextActive: {
    color: Palette.white,
  },
  activityHint: {
    fontSize: 12,
    color: Palette.gray,
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 18,
  },
  activityHintDark: {
    color: '#9ca3af',
  },
  boldHint: {
    fontWeight: '600',
    color: Palette.darkGray,
  },
  boldHintDark: {
    color: '#d1d5db',
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  weightInput: {
    flex: 1,
    backgroundColor: Palette.lightGray2,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  weightInputDark: {
    backgroundColor: '#262626',
    borderColor: '#404040',
    color: '#e5e5e5',
  },
  weightUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.darkGray,
    minWidth: 35,
  },
  weightUnitDark: {
    color: '#d1d5db',
  },
  logButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logButtonText: {
    color: Palette.white,
    fontSize: 16,
    fontWeight: '600',
  },
  weightHistory: {
    marginTop: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 12,
  },
  historyTitleDark: {
    color: '#d1d5db',
  },
  weightEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    marginBottom: 8,
  },
  weightEntryDark: {
    backgroundColor: '#262626',
  },
  weightValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.primary,
  },
  weightDate: {
    fontSize: 12,
    color: Palette.gray,
    marginTop: 2,
  },
  deleteButton: {
    color: Palette.error,
    fontSize: 20,
    fontWeight: 'bold',
    padding: 8,
  },
  tdeeRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  tdeeBox: {
    flex: 1,
    backgroundColor: '#f0f4ff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  tdeeValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  tdeeLabel: {
    fontSize: 12,
    color: Palette.gray,
  },
  tdeeHint: {
    fontSize: 13,
    lineHeight: 20,
    color: Palette.darkGray,
  },
  cyclingDayRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 12,
  },
  cyclingDayBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  cyclingDayActive: {
    backgroundColor: '#eff6ff',
    borderColor: Palette.primary,
  },
  cyclingDayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  cyclingDayLabelActive: {
    color: Palette.primary,
  },
  cyclingDayCals: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.primary,
    marginBottom: 2,
  },
  cyclingDayMacros: {
    fontSize: 11,
    color: Palette.gray,
  },
  cyclingEditBox: {
    marginTop: 8,
    gap: 16,
  },
  cyclingEditSection: {
    gap: 8,
  },
  cyclingMacroLabel: {
    width: 70,
    fontSize: 13,
    fontWeight: '600',
    color: Palette.darkGray,
  },
  cyclingInput: {
    flex: 1,
    backgroundColor: Palette.lightGray2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  apiKeyStatus: {
    fontSize: 13,
    marginTop: 4,
  },
});
