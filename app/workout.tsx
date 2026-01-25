import { EXERCISES, MUSCLE_COLORS, type Exercise } from '@/constants/exercises';
import { useAppTheme } from '@/hooks/use-theme';
import { useHevyWorkouts } from '@/hooks/use-hevy-workouts';
import { feedback } from '@/utils/feedback';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import {
    calculatePRs,
    calculateSetVolume,
    checkForNewPR,
    ExerciseSession,
    getLastWorkout,
    WorkoutSet
} from '@/utils/workoutCalculations';
import { HevyApiKeyModal } from '@/components/hevy/hevy-api-key-modal';
import { HevyWorkoutCard } from '@/components/hevy/hevy-workout-card';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

export default function WorkoutScreen() {
  const { isDark } = useAppTheme();
  const { workouts: hevyWorkouts, apiKeySet, setApiKey, isLoading: hevyLoading, error: hevyError } = useHevyWorkouts();
  const [exercises, setExercises] = useState<ExerciseSession[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([]);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [restDuration, setRestDuration] = useState(60);
  const [restRemaining, setRestRemaining] = useState(60);
  const [restRunning, setRestRunning] = useState(false);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [customExerciseMuscle, setCustomExerciseMuscle] = useState<string>('Chest');
  const [showHevyApiModal, setShowHevyApiModal] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  useEffect(() => {
    if (!restRunning) return;
    const id = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setRestRunning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [restRunning]);

  const loadHistory = async () => {
    try {
      const stored = await storage.get<any[]>(STORAGE_KEYS.WORKOUT_HISTORY, []);
      setWorkoutHistory(stored);
      
      const customExercisesData = await storage.get<Exercise[]>(STORAGE_KEYS.CUSTOM_EXERCISES, []);
      setCustomExercises(customExercisesData);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const formatSeconds = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const startRest = (seconds: number) => {
    setRestDuration(seconds);
    setRestRemaining(seconds);
    setRestRunning(true);
    Haptics.selectionAsync();
  };

  const toggleRest = () => {
    setRestRunning((prev) => !prev);
  };

  const resetRest = () => {
    setRestRunning(false);
    setRestRemaining(restDuration);
  };

  const updateExerciseNote = (exerciseIndex: number, note: string) => {
    const newExercises = [...exercises];
    newExercises[exerciseIndex].note = note;
    setExercises(newExercises);
  };

  const getSuggestedIncrement = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('deadlift') || lower.includes('squat') || lower.includes('hip thrust') || lower.includes('leg press')) return 5;
    if (lower.includes('bench') || lower.includes('row') || lower.includes('pull') || lower.includes('chin')) return 2.5;
    if (lower.includes('press') || lower.includes('lunge') || lower.includes('step') || lower.includes('split')) return 2;
    if (lower.includes('curl') || lower.includes('raise') || lower.includes('fly') || lower.includes('extension') || lower.includes('kickback')) return 0.5;
    return 1;
  };

  const buildSuggestion = (exerciseName: string, lastSets: WorkoutSet[] | null) => {
    if (!lastSets || lastSets.length === 0) return 'Log a solid first set today.';
    const last = lastSets[lastSets.length - 1];
    if (!last || (!last.weight && !last.reps)) return 'Focus on clean reps today.';
    if (last.weight <= 0) return 'Try adding +1–2 reps over last session.';

    const inc = getSuggestedIncrement(exerciseName);
    const targetWeight = last.weight + inc;
    return `Last: ${last.weight}kg × ${last.reps}. Try ${targetWeight.toFixed(1)}kg or +1–2 reps if form is clean.`;
  };

  const addExercise = (exerciseId: string) => {
    setExercises([
      ...exercises,
      { exerciseId, sets: [{ weight: 0, reps: 0, completed: false }], note: '' },
    ]);
    setShowExercisePicker(false);
    setSearchQuery('');
  };

  const addCustomExercise = async () => {
    if (!customExerciseName.trim()) {
      await feedback.alert('Error', 'Please enter exercise name');
      return;
    }

    const newCustomExercise: Exercise = {
      id: `custom_${Date.now()}`,
      name: customExerciseName,
      primary: customExerciseMuscle as any,
    };

    const updated = [...customExercises, newCustomExercise];
    setCustomExercises(updated);
    await storage.set(STORAGE_KEYS.CUSTOM_EXERCISES, updated);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCustomExerciseName('');
    setShowCustomInput(false);
    
    // Auto-add to current workout
    addExercise(newCustomExercise.id);
  };

  const allExercises = [...EXERCISES, ...customExercises];
  const filteredExercises = allExercises.filter(ex =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addSet = (exerciseIndex: number) => {
    const newExercises = [...exercises];
    const lastSet = newExercises[exerciseIndex].sets[newExercises[exerciseIndex].sets.length - 1];
    newExercises[exerciseIndex].sets.push({
      weight: lastSet?.weight || 0,
      reps: lastSet?.reps || 0,
      completed: false,
    });
    setExercises(newExercises);
  };

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string
  ) => {
    const newExercises = [...exercises];
    newExercises[exerciseIndex].sets[setIndex][field] = parseFloat(value) || 0;
    setExercises(newExercises);
  };

  const toggleSetComplete = async (exerciseIndex: number, setIndex: number) => {
    const newExercises = [...exercises];
    const set = newExercises[exerciseIndex].sets[setIndex];
    
    if (!set.completed && set.weight > 0 && set.reps > 0) {
      // Check for PR before marking complete
      const exerciseId = newExercises[exerciseIndex].exerciseId;
      const prs = calculatePRs(exerciseId, workoutHistory);
      const prCheck = checkForNewPR(set.weight, set.reps, prs);

      if (prCheck.isNew1RM || prCheck.isNewMaxWeight || prCheck.isNewMaxVolume) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        set.timestamp = Date.now(); // Mark when PR was achieved
      }
    }
    
    set.completed = !set.completed;
    setExercises(newExercises);
  };

  const finishWorkout = async () => {
    const completedExercises = exercises.filter(e =>
      e.sets.some(s => s.completed)
    );

    if (completedExercises.length === 0) {
      await feedback.alert('No Sets Completed', 'Complete at least one set to save the workout.');
      return;
    }

    const workout = {
      id: Date.now().toString(),
      timestamp: startTime,
      duration: Date.now() - startTime,
      exercises: completedExercises,
    };

    try {
      const history = await storage.get<any[]>(STORAGE_KEYS.WORKOUT_HISTORY, []);
      history.push(workout);
      await storage.set(STORAGE_KEYS.WORKOUT_HISTORY, history);

      const shouldSave = await feedback.confirm(
        'Workout Saved!',
        'Save this as a template for next time?'
      );

      if (shouldSave) {
        const templateName = await feedback.prompt(
          'Template Name',
          'Enter a name for this workout template:'
        );

        if (templateName) {
          const routines = await storage.get<any[]>(STORAGE_KEYS.WORKOUT_ROUTINES, []);
          const template = {
            id: Date.now().toString(),
            name: templateName,
            exercises: completedExercises.map(e => ({
              exerciseId: e.exerciseId,
              exerciseName: e.exerciseName,
              sets: e.sets.length,
            })),
          };
          routines.push(template);
          await storage.set(STORAGE_KEYS.WORKOUT_ROUTINES, routines);
          await feedback.alert('Success', `Template "${templateName}" saved!`);
        }
      }

      router.back();
    } catch (error) {
      await feedback.alert('Error', 'Failed to save workout.');
    }
  };

  const cancelWorkout = async () => {
    const shouldCancel = await feedback.confirm('Cancel Workout', 'Are you sure? All progress will be lost.');
    if (shouldCancel) {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: isDark ? '#0a0a0a' : '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.container, isDark && styles.containerDark]}>
        <View style={[styles.topBar, isDark && styles.topBarDark]}>
          <Pressable onPress={cancelWorkout}>
            <Text style={[styles.cancelButton, isDark && styles.cancelButtonDark]}>✕</Text>
          </Pressable>
          <View style={styles.topCenter}>
            <Text style={[styles.title, isDark && styles.titleDark]}>Active Workout</Text>
            <Text style={[styles.elapsedText, isDark && styles.elapsedTextDark]}>⏱ {formatSeconds(elapsed)}</Text>
          </View>
          <Pressable onPress={() => setShowHevyApiModal(true)} hitSlop={10}>
            <Text style={[styles.finishButton, isDark && styles.finishButtonDark]}>⚙️</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={[styles.restCard, isDark && styles.restCardDark]}>
            <View style={styles.restHeader}>
              <Text style={[styles.restTitle, isDark && styles.restTitleDark]}>Rest Timer</Text>
              <Text style={[styles.restTime, isDark && styles.restTimeDark]}>{formatSeconds(restRemaining * 1000)}</Text>
            </View>
          <View style={styles.restButtonsRow}>
            {[30, 60, 90].map((s) => (
              <Pressable key={s} style={styles.restPreset} onPress={() => startRest(s)}>
                <Text style={styles.restPresetText}>{s}s</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.restControls}>
            <Pressable style={[styles.restControlButton, restRunning && styles.restControlActive]} onPress={toggleRest}>
              <Text style={[styles.restControlText, restRunning && styles.restControlTextActive]}>{restRunning ? 'Pause' : 'Start'}</Text>
            </Pressable>
            <Pressable style={styles.restControlButton} onPress={resetRest}>
              <Text style={styles.restControlText}>Reset</Text>
            </Pressable>
          </View>
          <Text style={styles.restHint}>Tips: hit Start after a set; you'll get a buzz when time is up.</Text>
        </View>
        {exercises.map((exercise, exerciseIndex) => {
          const exerciseData = EXERCISES.find(e => e.id === exercise.exerciseId);
          if (!exerciseData) return null;

          const prs = calculatePRs(exercise.exerciseId, workoutHistory);
          const lastWorkout = getLastWorkout(exercise.exerciseId, workoutHistory);

          return (
            <View key={exerciseIndex} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View>
                  <Text style={styles.exerciseName}>{exerciseData.name}</Text>
                  <View style={styles.musclesRow}>
                    <View
                      style={[
                        styles.muscleBadge,
                        { backgroundColor: MUSCLE_COLORS[exerciseData.primary] },
                      ]}>
                      <Text style={styles.muscleBadgeText}>{exerciseData.primary}</Text>
                    </View>
                    {exerciseData.secondary?.map((muscle) => (
                      <View
                        key={muscle}
                        style={[
                          styles.muscleBadgeSecondary,
                          { borderColor: MUSCLE_COLORS[muscle] },
                        ]}>
                        <Text style={[styles.muscleBadgeTextSecondary, { color: MUSCLE_COLORS[muscle] }]}>
                          {muscle}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {(prs.oneRepMax > 0 || prs.maxWeight > 0) && (
                <View style={styles.prsBox}>
                  <Text style={styles.prsTitle}>Personal Records</Text>
                  <View style={styles.prsRow}>
                    {prs.oneRepMax > 0 && (
                      <Text style={styles.prText}>1RM: {Math.round(prs.oneRepMax)}kg</Text>
                    )}
                    {prs.maxWeight > 0 && (
                      <Text style={styles.prText}>Max: {prs.maxWeight}kg</Text>
                    )}
                    {prs.maxVolume > 0 && (
                      <Text style={styles.prText}>Vol: {Math.round(prs.maxVolume)}kg</Text>
                    )}
                  </View>
                </View>
              )}

              {lastWorkout && lastWorkout.length > 0 && (
                <Text style={styles.lastWorkout}>
                  Last: {lastWorkout[0].weight}kg × {lastWorkout[0].reps}
                </Text>
              )}

              <Text style={styles.suggestionText}>
                {buildSuggestion(exerciseData.name, lastWorkout)}
              </Text>

              <TextInput
                style={styles.noteInput}
                value={exercise.note || ''}
                onChangeText={(text) => updateExerciseNote(exerciseIndex, text)}
                placeholder="Notes or cues (e.g. tempo, stance, grip)"
                placeholderTextColor="#999"
                multiline
              />

              {exercise.sets.map((set, setIndex) => {
                const prCheck = set.weight > 0 && set.reps > 0 
                  ? checkForNewPR(set.weight, set.reps, prs)
                  : null;
                const isNewPR = prCheck && (prCheck.isNew1RM || prCheck.isNewMaxWeight || prCheck.isNewMaxVolume);

                return (
                  <View key={setIndex} style={styles.setRow}>
                    <Text style={styles.setNumber}>Set {setIndex + 1}</Text>
                    <View style={styles.setInputs}>
                      <TextInput
                        style={[styles.input, set.completed && styles.inputCompleted]}
                        value={set.weight > 0 ? set.weight.toString() : ''}
                        onChangeText={(val) => updateSet(exerciseIndex, setIndex, 'weight', val)}
                        keyboardType="decimal-pad"
                        placeholder="kg"
                        placeholderTextColor="#999"
                        editable={!set.completed}
                      />
                      <Text style={styles.inputSeparator}>×</Text>
                      <TextInput
                        style={[styles.input, set.completed && styles.inputCompleted]}
                        value={set.reps > 0 ? set.reps.toString() : ''}
                        onChangeText={(val) => updateSet(exerciseIndex, setIndex, 'reps', val)}
                        keyboardType="number-pad"
                        placeholder="reps"
                        placeholderTextColor="#999"
                        editable={!set.completed}
                      />
                    </View>
                    {set.completed && set.weight > 0 && set.reps > 0 && (
                      <Text style={styles.volumeText}>
                        {Math.round(calculateSetVolume(set.weight, set.reps))}kg
                      </Text>
                    )}
                    <Pressable
                      style={[styles.checkbox, set.completed && styles.checkboxCompleted]}
                      onPress={() => toggleSetComplete(exerciseIndex, setIndex)}>
                      {set.completed && <Text style={styles.checkmark}>✓</Text>}
                    </Pressable>
                    {isNewPR && set.completed && (
                      <Text style={styles.prBadge}>🥇</Text>
                    )}
                  </View>
                );
              })}

              <Pressable
                style={styles.addSetButton}
                onPress={() => addSet(exerciseIndex)}>
                <Text style={styles.addSetText}>+ Add Set</Text>
              </Pressable>
            </View>
          );
        })}

        <Pressable
          style={styles.addExerciseButton}
          onPress={() => setShowExercisePicker(true)}>
          <Text style={styles.addExerciseText}>+ Add Exercise</Text>
        </Pressable>
      </ScrollView>

      <HevyApiKeyModal
        visible={showHevyApiModal}
        onApiKeySubmit={setApiKey}
        onCancel={() => setShowHevyApiModal(false)}
        isLoading={hevyLoading}
        error={hevyError}
      />

      <Modal
        visible={showExercisePicker}
        animationType="slide"
        transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Exercise</Text>
              <Pressable onPress={() => setShowExercisePicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search exercises or muscle groups..."
              placeholderTextColor="#999"
            />

            <Pressable
              style={styles.customExerciseButton}
              onPress={() => setShowCustomInput(true)}>
              <Text style={styles.customExerciseButtonText}>+ Create Custom Exercise</Text>
            </Pressable>

            <ScrollView style={styles.exerciseList}>
              {filteredExercises.length === 0 && (
                <Text style={styles.noResults}>No exercises found</Text>
              )}
              {filteredExercises.map((ex) => (
                <Pressable
                  key={ex.id}
                  style={styles.exerciseOption}
                  onPress={() => addExercise(ex.id)}>
                  <View>
                    <Text style={styles.exerciseOptionName}>
                      {ex.name}
                      {ex.id.startsWith('custom_') && ' ✏️'}
                    </Text>
                    <View style={styles.musclesRow}>
                      <View
                        style={[
                          styles.muscleBadgeSmall,
                          { backgroundColor: MUSCLE_COLORS[ex.primary] },
                        ]}>
                        <Text style={styles.muscleBadgeTextSmall}>{ex.primary}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            {showCustomInput && (
              <View style={styles.customExerciseForm}>
                <Text style={styles.formTitle}>Create Custom Exercise</Text>
                <TextInput
                  style={styles.formInput}
                  value={customExerciseName}
                  onChangeText={setCustomExerciseName}
                  placeholder="Exercise name..."
                  placeholderTextColor="#999"
                />
                
                <Text style={styles.muscleGroupLabel}>Muscle Group:</Text>
                <ScrollView
                  horizontal
                  style={styles.muscleGroupPicker}
                  showsHorizontalScrollIndicator={false}>
                  {['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Glutes', 'Cardio'].map(
                    (muscle) => (
                      <Pressable
                        key={muscle}
                        style={[
                          styles.muscleChip,
                          customExerciseMuscle === muscle && styles.muscleChipSelected,
                        ]}
                        onPress={() => setCustomExerciseMuscle(muscle)}>
                        <Text
                          style={[
                            styles.muscleChipText,
                            customExerciseMuscle === muscle && styles.muscleChipTextSelected,
                          ]}>
                          {muscle}
                        </Text>
                      </Pressable>
                    )
                  )}
                </ScrollView>

                <View style={styles.formActions}>
                  <Pressable
                    style={styles.formButton}
                    onPress={addCustomExercise}>
                    <Text style={styles.formButtonText}>Create</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.formButton, styles.formButtonCancel]}
                    onPress={() => {
                      setShowCustomInput(false);
                      setCustomExerciseName('');
                    }}>
                    <Text style={styles.formButtonTextCancel}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
      </View>
    </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#0a0a0a',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  topBarDark: {
    backgroundColor: '#1a1a1a',
    borderBottomColor: '#333',
  },
  cancelButton: {
    fontSize: 24,
    color: '#666',
  },
  cancelButtonDark: {
    color: '#9ca3af',
  },
  topCenter: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  titleDark: {
    color: '#e5e5e5',
  },
  elapsedText: {
    marginTop: 2,
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  elapsedTextDark: {
    color: '#9ca3af',
  },
  finishButton: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  finishButtonDark: {
    color: '#60a5fa',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  restCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  restCardDark: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  restHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  restTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  restTitleDark: {
    color: '#e5e5e5',
  },
  restTime: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  restTimeDark: {
    color: '#60a5fa',
  },
  restButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  restPreset: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  restPresetText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  restControls: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  restControlButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  restControlActive: {
    backgroundColor: '#0066cc',
  },
  restControlText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  restControlTextActive: {
    color: '#fff',
  },
  restHint: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  exerciseCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  musclesRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  muscleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  muscleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  muscleBadgeSecondary: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  muscleBadgeTextSecondary: {
    fontSize: 12,
    fontWeight: '600',
  },
  prsBox: {
    backgroundColor: '#fff9e6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  prsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b8860b',
    marginBottom: 6,
  },
  prsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  prText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  lastWorkout: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  suggestionText: {
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 10,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    marginBottom: 12,
    minHeight: 48,
    textAlignVertical: 'top',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  setNumber: {
    width: 50,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  setInputs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    textAlign: 'center',
  },
  inputCompleted: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0066cc',
  },
  inputSeparator: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  volumeText: {
    fontSize: 12,
    color: '#666',
    width: 50,
    textAlign: 'right',
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkmark: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  prBadge: {
    fontSize: 20,
    marginLeft: 4,
  },
  addSetButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0066cc',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 8,
  },
  addSetText: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: '600',
  },
  addExerciseButton: {
    backgroundColor: '#0066cc',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  addExerciseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  searchInput: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  customExerciseButton: {
    backgroundColor: '#0066cc',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  customExerciseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  exerciseList: {
    flex: 1,
  },
  exerciseOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  exerciseOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  muscleBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  muscleBadgeTextSmall: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  customExerciseForm: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  formInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  muscleGroupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  muscleGroupPicker: {
    marginBottom: 12,
  },
  muscleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muscleChipSelected: {
    backgroundColor: '#0066cc',
  },
  muscleChipText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  muscleChipTextSelected: {
    color: '#fff',
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
  },
  formButton: {
    flex: 1,
    backgroundColor: '#0066cc',
    paddingVertical: 10,
    borderRadius: 6,
  },
  formButtonCancel: {
    backgroundColor: '#e0e0e0',
  },
  formButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  formButtonTextCancel: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  noResults: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 24,
    fontSize: 14,  },
});