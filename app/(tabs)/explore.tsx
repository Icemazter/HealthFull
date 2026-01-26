import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Routine {
  id: string;
  name: string;
  exercises: string[];
  lastUsed?: number;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: Array<{ exerciseId: string; exerciseName: string }>;
  createdAt: number;
}

export default function WorkoutHubScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, colorScheme, toggleTheme } = useAppTheme();
  const [recentRoutines, setRecentRoutines] = useState<Routine[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const routines = await storage.get<Routine[]>(STORAGE_KEYS.WORKOUT_ROUTINES, []);
      setRecentRoutines(routines.slice(0, 3));
      
      const history = await storage.get<any[]>(STORAGE_KEYS.WORKOUT_HISTORY, []);
      setWorkoutHistory(history);
      
      const templatesData = await storage.get<WorkoutTemplate[]>(STORAGE_KEYS.WORKOUT_TEMPLATES, []);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load workout data:', error);
    }
  };

  const startEmptyWorkout = () => {
    router.push('/workout');
  };

  const startRoutine = (routine: Routine) => {
    router.push({
      pathname: '/workout',
      params: { routineId: routine.id },
    });
  };

  const startTemplate = (template: WorkoutTemplate) => {
    router.push({
      pathname: '/workout',
      params: { templateId: template.id, templateName: template.name },
    });
  };

  return (
    <>
      <ScrollView style={[styles.container, isDark && styles.containerDark]}>
      <ThemedView style={[styles.header, isDark && styles.headerDark, { paddingTop: Math.max(insets.top, 16) }]}>
        <ThemedText type="title" style={[styles.headerTitle, isDark && styles.headerTitleDark]}>Workout Hub</ThemedText>
        <Pressable style={styles.themeToggle} onPress={toggleTheme}>
          <Text style={styles.themeToggleIcon}>{colorScheme === 'dark' ? '🌙' : colorScheme === 'light' ? '☀️' : '🌗'}</Text>
        </Pressable>
      </ThemedView>

      <View style={styles.content}>
        <Pressable
          style={[styles.startWorkoutButton, isDark && styles.startWorkoutButtonDark]}
          onPress={startEmptyWorkout}>
          <Text style={styles.startWorkoutText}>Start Empty Workout</Text>
        </Pressable>

      {recentRoutines.length > 0 && (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
            Quick Start Routines
          </ThemedText>
          {recentRoutines.map((routine) => (
            <Pressable
              key={routine.id}
              style={[styles.routineCard, isDark && styles.routineCardDark]}
              onPress={() => startRoutine(routine)}>
              <Text style={[styles.routineName, isDark && styles.routineNameDark]}>{routine.name}</Text>
              <Text style={[styles.routineDetail, isDark && styles.routineDetailDark]}>
                {routine.exercises.length} exercises
              </Text>
            </Pressable>
          ))}
        </ThemedView>
      )}

      {templates.length > 0 && (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
            💾 Saved Templates
          </ThemedText>
          {templates.map((template) => (
            <View key={template.id} style={styles.templateCard}>
              <Pressable
                style={[styles.templateContent, isDark && styles.templateContentDark]}
                onPress={() => startTemplate(template)}>
                <Text style={[styles.templateName, isDark && styles.templateNameDark]}>{template.name}</Text>
                <Text style={[styles.templateDetail, isDark && styles.templateDetailDark]}>
                  {template.exercises.length} exercises
                </Text>
              </Pressable>
            </View>
          ))}
        </ThemedView>
      )}

      <View style={styles.linksContainer}>
        <Pressable
          style={[styles.linkButton, isDark && styles.linkButtonDark]}
          onPress={() => router.push('/routines')}>
          <Text style={[styles.linkText, isDark && styles.linkTextDark]}>📋 Manage Routines</Text>
        </Pressable>

        <Pressable
          style={[styles.linkButton, isDark && styles.linkButtonDark]}
          onPress={() => router.push('/history')}>
          <Text style={[styles.linkText, isDark && styles.linkTextDark]}>📊 Workout History</Text>
          {workoutHistory.length > 0 && (
            <Text style={styles.linkBadge}>{workoutHistory.length}</Text>
          )}
        </Pressable>
      </View>

      {workoutHistory.length > 0 && (
        <ThemedView style={[styles.statsCard, isDark && styles.statsCardDark]}>
          <Text style={[styles.statsTitle, isDark && styles.statsTitleDark]}>This Week</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {workoutHistory.filter(w => 
                  w.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000
                ).length}
              </Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {workoutHistory.reduce((acc, w) => 
                  acc + (w.exercises?.length || 0), 0
                )}
              </Text>
              <Text style={styles.statLabel}>Total Exercises</Text>
            </View>
          </View>
        </ThemedView>
      )}
      </View>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.white,
    padding: 0,
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
    color: Palette.primary,
    fontWeight: '700',
    flex: 1,
  },
  headerTitleDark: {
    color: '#60a5fa',
  },
  themeToggle: {
    padding: 8,
    marginLeft: 8,
  },
  themeToggleIcon: {
    fontSize: 24,
  },
  content: {
    padding: 16,
  },
  startWorkoutButton: {
    backgroundColor: Palette.primary,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startWorkoutButtonDark: {
    backgroundColor: '#1e3a8a',
  },
  startWorkoutText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  sectionTitleDark: {
    color: '#60a5fa',
  },
  routineCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  routineCardDark: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  routineName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  routineNameDark: {
    color: '#e5e5e5',
  },
  routineDetail: {
    fontSize: 14,
    color: '#666',
  },
  routineDetailDark: {
    color: '#9ca3af',
  },
  templateCard: {
    marginBottom: 10,
  },
  templateContent: {
    backgroundColor: '#f3f4f6',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  templateContentDark: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
  },
  templateName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  templateNameDark: {
    color: '#e5e5e5',
  },
  templateDetail: {
    fontSize: 13,
    color: '#666',
  },
  templateDetailDark: {
    color: '#9ca3af',
  },
  linksContainer: {
    marginBottom: 24,
    gap: 12,
  },
  linkButton: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  linkButtonDark: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066cc',
  },
  linkTextDark: {
    color: '#60a5fa',
  },
  linkBadge: {
    backgroundColor: '#0066cc',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsCard: {
    backgroundColor: '#f0f9ff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  statsCardDark: {
    backgroundColor: '#1a1a1a',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsTitleDark: {
    color: '#60a5fa',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});
