import { AchievementCard } from '@/components/ui/achievement-card';
import { Palette } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  progress?: number;
  total?: number;
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme, colorScheme } = useAppTheme();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalFoodsLogged: 0,
    currentStreak: 0,
    longestStreak: 0,
    weeklyWorkouts: 0,
  });

  useEffect(() => {
    loadProgress();
  }, []);

  const calculateStreaks = (workoutData: any[]) => {
    if (workoutData.length === 0) return { currentStreak: 0, longestStreak: 0 };
    
    // Sort by date descending (most recent first)
    const sorted = [...workoutData].sort((a, b) => b.timestamp - a.timestamp);
    
    // Group workouts by day (unique dates)
    const workoutDates = new Set<string>();
    sorted.forEach((w: any) => {
      const date = new Date(w.timestamp).toLocaleDateString('en-CA'); // YYYY-MM-DD format
      workoutDates.add(date);
    });
    
    const uniqueDates = Array.from(workoutDates).map(d => new Date(d).getTime()).sort((a, b) => b - a);
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if today has a workout
    if (uniqueDates[0] && new Date(uniqueDates[0]).toLocaleDateString('en-CA') === today.toLocaleDateString('en-CA')) {
      currentStreak = 1;
    } else {
      // Check if yesterday has a workout
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (uniqueDates[0] && new Date(uniqueDates[0]).toLocaleDateString('en-CA') === yesterday.toLocaleDateString('en-CA')) {
        currentStreak = 1;
      } else {
        currentStreak = 0; // Streak broken
      }
    }
    
    // Calculate longest streak
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const current = new Date(uniqueDates[i]);
      const next = new Date(uniqueDates[i + 1]);
      
      // Days between (should be exactly 1 for consecutive days)
      const diff = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff === 1) {
        tempStreak++;
        currentStreak = currentStreak > 0 ? tempStreak : currentStreak;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    
    return { currentStreak, longestStreak };
  };

  const loadProgress = async () => {
    try {
      const workoutData = await storage.get<any[]>(STORAGE_KEYS.WORKOUT_HISTORY, []);
      const foodData = await storage.get<any[]>(STORAGE_KEYS.FOOD_ENTRIES, []);
      
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const weeklyWorkouts = workoutData.filter((w: any) => w.timestamp > weekAgo).length;
      
      const { currentStreak, longestStreak } = calculateStreaks(workoutData);
      
      const achievementsList: Achievement[] = [
        {
          id: 'first-workout',
          title: 'First Workout',
          description: 'Complete your first workout',
          emoji: '🏋️',
          unlocked: workoutData.length >= 1,
        },
        {
          id: '10-workouts',
          title: '10 Workouts',
          description: 'Complete 10 workouts',
          emoji: '💪',
          unlocked: workoutData.length >= 10,
          progress: workoutData.length,
          total: 10,
        },
        {
          id: '50-workouts',
          title: '50 Workouts',
          description: 'Complete 50 workouts',
          emoji: '🔥',
          unlocked: workoutData.length >= 50,
          progress: Math.min(workoutData.length, 50),
          total: 50,
        },
        {
          id: '100-workouts',
          title: 'Century Club',
          description: 'Complete 100 workouts',
          emoji: '🏆',
          unlocked: workoutData.length >= 100,
          progress: Math.min(workoutData.length, 100),
          total: 100,
        },
        {
          id: 'first-scan',
          title: 'First Scan',
          description: 'Scan your first product',
          emoji: '📸',
          unlocked: foodData.length >= 1,
        },
        {
          id: '7-day-streak',
          title: '7 Day Streak',
          description: 'Workout 7 days in a row',
          emoji: '🔥',
          unlocked: currentStreak >= 7,
          progress: currentStreak,
          total: 7,
        },
        {
          id: '30-day-streak',
          title: '30 Day Streak',
          description: 'Workout 30 days in a row',
          emoji: '💥',
          unlocked: currentStreak >= 30,
          progress: currentStreak,
          total: 30,
        },
        {
          id: '60-day-streak',
          title: '60 Day Streak',
          description: 'Workout 60 days in a row',
          emoji: '⭐',
          unlocked: currentStreak >= 60,
          progress: currentStreak,
          total: 60,
        },
        {
          id: '90-day-streak',
          title: '90 Day Streak',
          description: 'Workout 90 days in a row',
          emoji: '👑',
          unlocked: currentStreak >= 90,
          progress: currentStreak,
          total: 90,
        },
        {
          id: 'consistency',
          title: 'Consistent',
          description: 'Work out 3 times this week',
          emoji: '📅',
          unlocked: weeklyWorkouts >= 3,
          progress: weeklyWorkouts,
          total: 3,
        },
      ];
      
      setAchievements(achievementsList);
      setStats({
        totalWorkouts: workoutData.length,
        totalFoodsLogged: foodData.length,
        currentStreak,
        longestStreak,
        weeklyWorkouts,
      });
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  return (
    <>
      <ScrollView style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>Progress</Text>
        <Pressable style={styles.themeToggle} onPress={toggleTheme}>
          <Text style={styles.themeToggleIcon}>{colorScheme === 'dark' ? '☀️' : colorScheme === 'light' ? '🌙' : '🌗'}</Text>
        </Pressable>
      </View>

      {/* Stats Overview */}
      <View style={[styles.statsCard, isDark && styles.statsCardDark]}>
        <Text style={[styles.statsTitle, isDark && styles.statsTitleDark]}>📊 Your Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, isDark && styles.statValueDark]}>{stats.totalWorkouts}</Text>
            <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Total Workouts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, isDark && styles.statValueDark]}>{stats.weeklyWorkouts}</Text>
            <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>This Week</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, isDark && styles.statValueDark]}>{stats.totalFoodsLogged}</Text>
            <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Foods Logged</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, isDark && styles.statValueDark]}>{stats.currentStreak}</Text>
            <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Day Streak</Text>
          </View>
        </View>
      </View>

      {/* Achievements */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>🏅 Achievements</Text>
        <Text style={[styles.achievementCount, isDark && styles.achievementCountDark]}>
          {achievements.filter(a => a.unlocked).length} / {achievements.length} Unlocked
        </Text>
        
        {achievements.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            emoji={achievement.emoji}
            title={achievement.title}
            description={achievement.description}
            unlocked={achievement.unlocked}
            isDark={isDark}
            progress={achievement.progress}
            total={achievement.total}
          />
        ))}
      </View>
    </ScrollView>
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
  statsCard: {
    margin: 16,
    padding: 20,
    backgroundColor: Palette.primary,
    borderRadius: 16,
  },
  statsCardDark: {
    backgroundColor: '#1e3a8a',
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Palette.white,
    marginBottom: 16,
  },
  statsTitleDark: {
    color: '#e5e5e5',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Palette.white,
  },
  statValueDark: {
    color: '#e5e5e5',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  statLabelDark: {
    color: 'rgba(255,255,255,0.9)',
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Palette.primary,
    marginBottom: 8,
  },
  sectionTitleDark: {
    color: '#60a5fa',
  },
  achievementCount: {
    fontSize: 14,
    color: Palette.gray,
    marginBottom: 16,
  },
  achievementCountDark: {
    color: '#9ca3af',
  },
});
