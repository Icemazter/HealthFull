import { HevyWorkoutCard } from '@/components/hevy/hevy-workout-card';
import { EXERCISES, MUSCLE_COLORS } from '@/constants/exercises';
import { useHevyWorkouts } from '@/hooks/use-hevy-workouts';
import { useAppTheme } from '@/hooks/use-theme';
import { formatDate, formatDuration } from '@/utils/date';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { calculateSetVolume } from '@/utils/workoutCalculations';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface Workout {
  id: string;
  timestamp: number;
  duration: number;
  exercises: any[];
}

export default function HistoryScreen() {
  const { isDark } = useAppTheme();
  const { workouts: hevyWorkouts } = useHevyWorkouts();
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const history = await storage.get<Workout[]>(STORAGE_KEYS.WORKOUT_HISTORY, []);
      setWorkouts([...history].reverse()); // Most recent first
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const calculateTotalVolume = (workout: Workout) => {
    let total = 0;
    workout.exercises?.forEach(exercise => {
      exercise.sets?.forEach((set: any) => {
        if (set.completed) {
          total += calculateSetVolume(set.weight, set.reps);
        }
      });
    });
    return Math.round(total);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Workout History</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {workouts.length === 0 && hevyWorkouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No workouts yet</Text>
            <Text style={styles.emptySubtext}>Start your first workout to see it here</Text>
          </View>
        ) : (
          <>
            {/* Hevy Workouts */}
            {hevyWorkouts.map((hevyWorkout) => (
              <HevyWorkoutCard
                key={hevyWorkout.id}
                workout={hevyWorkout}
                isDark={isDark}
              />
            ))}

            {/* Local Workouts */}
            {workouts.map((workout) => {
              const totalVolume = calculateTotalVolume(workout);
              const totalSets = workout.exercises?.reduce(
                (acc, ex) => acc + (ex.sets?.filter((s: any) => s.completed).length || 0),
                0
              );

              return (
                <View key={workout.id} style={styles.workoutCard}>
                  <View style={styles.workoutHeader}>
                    <Text style={styles.workoutDate}>{formatDate(workout.timestamp)}</Text>
                    <Text style={styles.workoutDuration}>{formatDuration(workout.duration)}</Text>
                  </View>

                  <View style={styles.workoutStats}>
                    <View style={styles.statBadge}>
                      <Text style={styles.statValue}>{workout.exercises?.length || 0}</Text>
                      <Text style={styles.statLabel}>exercises</Text>
                    </View>
                    <View style={styles.statBadge}>
                      <Text style={styles.statValue}>{totalSets}</Text>
                      <Text style={styles.statLabel}>sets</Text>
                    </View>
                    <View style={styles.statBadge}>
                      <Text style={styles.statValue}>{totalVolume}</Text>
                      <Text style={styles.statLabel}>kg volume</Text>
                    </View>
                  </View>

                  <View style={styles.exercisesList}>
                    {workout.exercises?.map((exercise, index) => {
                      const exerciseData = EXERCISES.find(e => e.id === exercise.exerciseId);
                      if (!exerciseData) return null;

                      const completedSets = exercise.sets?.filter((s: any) => s.completed) || [];

                      return (
                        <View key={index} style={styles.exerciseRow}>
                          <View
                            style={[
                              styles.muscleDot,
                              { backgroundColor: MUSCLE_COLORS[exerciseData.primary] },
                            ]}
                          />
                          <Text style={styles.exerciseName}>{exerciseData.name}</Text>
                          <Text style={styles.exerciseSets}>
                            {completedSets.length} × {completedSets[0]?.weight || 0}kg
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  workoutCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  workoutDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  workoutDuration: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  workoutStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statBadge: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  exercisesList: {
    gap: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muscleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  exerciseName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  exerciseSets: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
});
