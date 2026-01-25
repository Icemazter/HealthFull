import { Palette } from '@/constants/theme';
import { HevyWorkoutSession } from '@/hooks/use-hevy-workouts';
import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';

interface HevyWorkoutCardProps {
  workout: HevyWorkoutSession;
  isDark: boolean;
  onPress?: () => void;
}

export const HevyWorkoutCard = React.memo(function HevyWorkoutCard({
  workout,
  isDark,
  onPress,
}: HevyWorkoutCardProps) {
  const duration = workout.endTime
    ? Math.round((workout.endTime - workout.startTime) / 60000)
    : null;

  const date = new Date(workout.startTime);
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const totalVolume = workout.exercises.reduce((acc, ex) => {
    const exVolume = ex.sets.reduce((setAcc, set) => {
      return setAcc + set.reps * set.weight;
    }, 0);
    return acc + exVolume;
  }, 0);

  return (
    <Pressable
      style={[styles.card, isDark && styles.cardDark]}
      onPress={onPress}
      hitSlop={8}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.date, isDark && styles.dateDark]}>
            {dateStr} at {timeStr}
          </Text>
          <Text style={[styles.exerciseCount, isDark && styles.exerciseCountDark]}>
            {workout.exercises.length} exercise
            {workout.exercises.length > 1 ? 's' : ''}
            {duration && ` • ${duration}min`}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Hevy</Text>
        </View>
      </View>

      <View style={styles.exerciseList}>
        {workout.exercises.map((exercise, idx) => (
          <View key={`${exercise.name}-${idx}`} style={styles.exerciseItem}>
            <Text style={[styles.exerciseName, isDark && styles.exerciseNameDark]}>
              {exercise.name}
            </Text>
            <Text style={[styles.sets, isDark && styles.setsDark]}>
              {exercise.sets.length} sets •{' '}
              {exercise.sets
                .reduce((acc, s) => acc + s.reps, 0)
                .toLocaleString()}{' '}
              reps
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.volume, isDark && styles.volumeDark]}>
          Total Volume: {totalVolume.toLocaleString()}kg
        </Text>
      </View>

      {workout.notes && (
        <View style={styles.notes}>
          <Text style={[styles.notesText, isDark && styles.notesTextDark]}>
            {workout.notes}
          </Text>
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  cardDark: {
    backgroundColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
  },
  dateDark: {
    color: '#e2e8f0',
  },
  exerciseCount: {
    fontSize: 12,
    color: Palette.gray,
    marginTop: 2,
  },
  exerciseCountDark: {
    color: '#cbd5e1',
  },
  badge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  exerciseList: {
    gap: 8,
    marginBottom: 10,
  },
  exerciseItem: {
    paddingVertical: 6,
  },
  exerciseName: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.darkGray,
  },
  exerciseNameDark: {
    color: '#e2e8f0',
  },
  sets: {
    fontSize: 12,
    color: Palette.gray,
    marginTop: 2,
  },
  setsDark: {
    color: '#cbd5e1',
  },
  footer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.lightGray2,
  },
  volume: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.primary,
  },
  volumeDark: {
    color: '#a78bfa',
  },
  notes: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.lightGray2,
  },
  notesText: {
    fontSize: 12,
    color: Palette.gray,
    fontStyle: 'italic',
  },
  notesTextDark: {
    color: '#cbd5e1',
  },
});
