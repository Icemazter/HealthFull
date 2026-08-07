import { Palette } from '@/constants/theme';
import { useHistoryManager } from '@/hooks/use-persisted-state';
import { useAppTheme } from '@/hooks/use-theme';
import { feedback, validate } from '@/utils/feedback';
import { STORAGE_KEYS } from '@/utils/storage';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MeasurementType = 'Waist' | 'Hips' | 'Chest' | 'Arm' | 'Thigh';

interface BodyMeasurement {
  id: string;
  type: MeasurementType;
  value: string;
  timestamp: number;
}

interface WeightEntry {
  date: string;
  weight: string;
  timestamp: number;
}

interface DailyContext {
  timestamp: number;
  sleepHours?: string;
  hunger?: 'Low' | 'Moderate' | 'High';
  stress?: 'Low' | 'Moderate' | 'High';
  digestion?: 'Comfortable' | 'Mixed' | 'Uncomfortable';
  note?: string;
}

const measurementTypes: MeasurementType[] = ['Waist', 'Hips', 'Chest', 'Arm', 'Thigh'];

export default function MeasurementsScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, colorScheme, toggleTheme } = useAppTheme();
  const [weight, setWeight] = useState('');
  const [measurement, setMeasurement] = useState('');
  const [type, setType] = useState<MeasurementType>('Waist');
  const [sleepHours, setSleepHours] = useState('');
  const [hunger, setHunger] = useState<DailyContext['hunger']>('Moderate');
  const [stress, setStress] = useState<DailyContext['stress']>('Moderate');
  const [digestion, setDigestion] = useState<NonNullable<DailyContext['digestion']>>('Comfortable');
  const [note, setNote] = useState('');
  const weightManager = useHistoryManager<WeightEntry>(STORAGE_KEYS.WEIGHT_HISTORY);
  const measurementManager = useHistoryManager<BodyMeasurement>(STORAGE_KEYS.BODY_MEASUREMENTS);
  const contextManager = useHistoryManager<DailyContext>(STORAGE_KEYS.DAILY_CONTEXT);

  const logWeight = async () => {
    if (!validate.number(weight).valid) {
      return feedback.error('Please enter a valid weight.', 'Invalid Weight');
    }

    await weightManager.add({
      date: new Date().toLocaleDateString(),
      weight,
      timestamp: Date.now(),
    });
    setWeight('');
    await feedback.success();
  };

  const logMeasurement = async () => {
    if (!validate.number(measurement).valid) {
      return feedback.error('Please enter a valid measurement.', 'Invalid Measurement');
    }

    await measurementManager.add({
      id: `${Date.now()}-${type}`,
      type,
      value: measurement,
      timestamp: Date.now(),
    });
    setMeasurement('');
    await feedback.success();
  };

  const saveContext = async () => {
    const context: DailyContext = {
      timestamp: Date.now(),
      sleepHours: sleepHours || undefined,
      hunger,
      stress,
      digestion,
      note: note.trim() || undefined,
    };
    await contextManager.add(context);
    setNote('');
    await feedback.success('Daily context saved.');
  };

  return (
    <ScrollView
      style={[styles.container, isDark && styles.containerDark]}
      contentContainerStyle={styles.content}>
      <View style={[styles.header, isDark && styles.headerDark, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={[styles.headerTitle, isDark && styles.textDark]}>Measurements</Text>
        <Pressable style={styles.themeToggle} onPress={toggleTheme}>
          <Text style={styles.themeToggleIcon}>{colorScheme === 'dark' ? 'Dark' : colorScheme === 'light' ? 'Light' : 'Auto'}</Text>
        </Pressable>
      </View>

      <View style={[styles.contextSection, isDark && styles.contextSectionDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>Body Weight</Text>
        <Text style={[styles.description, isDark && styles.mutedDark]}>Log a consistent weigh-in to follow your trend over time.</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="75.5"
            placeholderTextColor={isDark ? '#666' : '#999'}
          />
          <Text style={[styles.unit, isDark && styles.mutedDark]}>kg</Text>
          <Pressable style={styles.logButton} onPress={logWeight}>
            <Text style={styles.logButtonText}>Log</Text>
          </Pressable>
        </View>

        <View style={[styles.card, isDark && styles.cardDark]}>
          <Text style={[styles.cardTitle, isDark && styles.textDark]}>Daily context</Text>
          <Text style={[styles.description, isDark && styles.mutedDark]}>Optional context helps interpret normal changes in weight and appetite.</Text>
          <Text style={[styles.label, isDark && styles.mutedDark]}>Sleep hours</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={sleepHours}
            onChangeText={setSleepHours}
            keyboardType="decimal-pad"
            placeholder="7.5"
            placeholderTextColor={isDark ? '#666' : '#999'}
          />
          <Text style={[styles.label, styles.contextLabel, isDark && styles.mutedDark]}>Hunger</Text>
          <View style={styles.typeRow}>
            {(['Low', 'Moderate', 'High'] as const).map((value) => (
              <Pressable key={value} style={[styles.chip, isDark && styles.chipDark, hunger === value && styles.chipActive]} onPress={() => setHunger(value)}>
                <Text style={[styles.chipText, isDark && styles.textDark, hunger === value && styles.chipTextActive]}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.label, styles.contextLabel, isDark && styles.mutedDark]}>Stress</Text>
          <View style={styles.typeRow}>
            {(['Low', 'Moderate', 'High'] as const).map((value) => (
              <Pressable key={value} style={[styles.chip, isDark && styles.chipDark, stress === value && styles.chipActive]} onPress={() => setStress(value)}>
                <Text style={[styles.chipText, isDark && styles.textDark, stress === value && styles.chipTextActive]}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.label, styles.contextLabel, isDark && styles.mutedDark]}>Digestion</Text>
          <View style={styles.typeRow}>
            {(['Comfortable', 'Mixed', 'Uncomfortable'] as const).map((value) => (
              <Pressable key={value} style={[styles.chip, isDark && styles.chipDark, digestion === value && styles.chipActive]} onPress={() => setDigestion(value)}>
                <Text style={[styles.chipText, isDark && styles.textDark, digestion === value && styles.chipTextActive]}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[styles.input, styles.noteInput, isDark && styles.inputDark]}
            value={note}
            onChangeText={setNote}
            placeholder="Optional note"
            placeholderTextColor={isDark ? '#666' : '#999'}
          />
          <Pressable style={[styles.logButton, styles.contextButton]} onPress={saveContext}>
            <Text style={styles.logButtonText}>Save context</Text>
          </Pressable>
        </View>
        {weightManager.history.slice(0, 5).map((entry) => (
          <View key={entry.timestamp} style={[styles.entry, isDark && styles.entryDark]}>
            <Text style={[styles.entryValue, isDark && styles.textDark]}>{entry.weight} kg</Text>
            <Text style={[styles.entryDate, isDark && styles.mutedDark]}>{entry.date}</Text>
            <Pressable onPress={() => weightManager.remove(entry.timestamp)}>
              <Text style={styles.delete}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>Body Measurements</Text>
        <Text style={[styles.description, isDark && styles.mutedDark]}>Track circumferences in centimeters to see changes beyond the scale.</Text>
        <View style={styles.typeRow}>
          {measurementTypes.map((measurementType) => (
            <Pressable
              key={measurementType}
              style={[styles.chip, isDark && styles.chipDark, type === measurementType && styles.chipActive]}
              onPress={() => setType(measurementType)}>
              <Text style={[styles.chipText, isDark && styles.textDark, type === measurementType && styles.chipTextActive]}>{measurementType}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={measurement}
            onChangeText={setMeasurement}
            keyboardType="decimal-pad"
            placeholder="80"
            placeholderTextColor={isDark ? '#666' : '#999'}
          />
          <Text style={[styles.unit, isDark && styles.mutedDark]}>cm</Text>
          <Pressable style={styles.logButton} onPress={logMeasurement}>
            <Text style={styles.logButtonText}>Log</Text>
          </Pressable>
        </View>
        {measurementManager.history.slice(0, 10).map((entry) => (
          <View key={entry.id} style={[styles.entry, isDark && styles.entryDark]}>
            <Text style={[styles.entryValue, isDark && styles.textDark]}>{entry.type}: {entry.value} cm</Text>
            <Text style={[styles.entryDate, isDark && styles.mutedDark]}>{new Date(entry.timestamp).toLocaleDateString()}</Text>
            <Pressable onPress={() => measurementManager.remove(entry.timestamp)}>
              <Text style={styles.delete}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.white },
  containerDark: { backgroundColor: '#0a0a0a' },
  header: { paddingBottom: 20, paddingHorizontal: 20, backgroundColor: Palette.lightGray, borderBottomWidth: 1, borderBottomColor: '#e5e5e5', flexDirection: 'row', alignItems: 'center' },
  headerDark: { backgroundColor: '#1a1a1a', borderBottomColor: '#333' },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: Palette.primary, flex: 1 },
  themeToggle: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#e2e8f0' },
  themeToggleIcon: { fontSize: 12, fontWeight: '700', color: '#334155' },
  content: { paddingBottom: 32 },
  card: { marginHorizontal: 16, marginTop: 20, padding: 24, borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  cardDark: { backgroundColor: '#1a1a1a', borderColor: '#333' },
  contextSection: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  contextSectionDark: { borderTopColor: '#333' },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  description: { marginTop: 8, marginBottom: 20, color: '#64748b', lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  contextLabel: { marginTop: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { flex: 1, minWidth: 0, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff', fontSize: 16, color: '#111827' },
  inputDark: { backgroundColor: '#262626', borderColor: '#444', color: '#f5f5f5' },
  unit: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  logButton: { flexShrink: 0, backgroundColor: Palette.primary, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 10 },
  logButtonText: { color: '#fff', fontWeight: '700' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#e2e8f0' },
  chipDark: { backgroundColor: '#333' },
  chipActive: { backgroundColor: Palette.primary },
  chipText: { color: '#334155', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  entry: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  entryDark: { borderTopColor: '#333' },
  entryValue: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  entryDate: { fontSize: 13, color: '#64748b', marginRight: 12 },
  delete: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
  textDark: { color: '#f5f5f5' },
  mutedDark: { color: '#a3a3a3' },
  noteInput: { marginTop: 4, minHeight: 48 },
  contextButton: { alignSelf: 'flex-start', marginTop: 16 },
});
