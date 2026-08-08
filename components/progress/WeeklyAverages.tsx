/**
 * WeeklyAverages — shows a rolling 7-day calorie average as a simple bar chart.
 * Helps users see trends over the past 8 weeks without fixating on single days.
 */
import { Palette } from '@/constants/theme';
import { FoodEntry } from '@/hooks/use-food-manager';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface WeeklyAveragesProps {
  isDark: boolean;
  foodHistory: FoodEntry[];
  calorieGoal: number;
}

interface WeekData {
  label: string;
  avg: number;
  days: number;
}

export function WeeklyAverages({ isDark, foodHistory, calorieGoal }: WeeklyAveragesProps) {
  const weeks = useMemo<WeekData[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group entries by date
    const byDate: Record<string, number> = {};
    foodHistory.forEach((e) => {
      const d = new Date(e.timestamp);
      d.setHours(0, 0, 0, 0);
      const key = d.toLocaleDateString('en-CA');
      byDate[key] = (byDate[key] ?? 0) + e.calories;
    });

    const result: WeekData[] = [];
    for (let w = 7; w >= 0; w--) {
      // Week starting 7*(w+1)-1 days ago through 7*w days ago
      let totalCals = 0;
      let loggedDays = 0;
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (w * 7 + d));
        if (date > today) continue;
        const key = date.toLocaleDateString('en-CA');
        if (byDate[key] !== undefined) {
          totalCals += byDate[key];
          loggedDays++;
        }
      }
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() - w * 7);
      const label = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      result.push({
        label: w === 0 ? 'This week' : label,
        avg: loggedDays > 0 ? Math.round(totalCals / loggedDays) : 0,
        days: loggedDays,
      });
    }
    return result;
  }, [foodHistory]);

  const maxVal = Math.max(calorieGoal * 1.3, ...weeks.map((w) => w.avg));

  const bg = isDark ? '#1e293b' : '#f8fafc';
  const textColor = isDark ? '#f1f5f9' : '#111';
  const subColor = isDark ? '#64748b' : '#999';
  const barBg = isDark ? '#374151' : '#e5e7eb';

  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>📈 Weekly Averages</Text>
      <Text style={[styles.subtitle, { color: subColor }]}>
        Rolling 7-day avg calories · Goal: {calorieGoal} kcal
      </Text>

      <View style={styles.chart}>
        {weeks.map((week, i) => {
          const barHeight = maxVal > 0 ? (week.avg / maxVal) * 120 : 0;
          const isOverGoal = week.avg > calorieGoal * 1.1;
          const isUnder = week.avg > 0 && week.avg < calorieGoal * 0.85;
          const barColor = week.avg === 0
            ? barBg
            : isOverGoal
            ? '#ef4444'
            : isUnder
            ? '#f59e0b'
            : '#22c55e';

          return (
            <View key={i} style={styles.barColumn}>
              <Text style={[styles.barValue, { color: textColor }]}>
                {week.avg > 0 ? week.avg : '–'}
              </Text>
              <View style={[styles.barTrack, { backgroundColor: barBg, height: 120 }]}>
                <View
                  style={[
                    styles.bar,
                    { height: barHeight, backgroundColor: barColor },
                  ]}
                />
                {/* Goal line */}
                {calorieGoal > 0 && (
                  <View
                    style={[
                      styles.goalLine,
                      { bottom: (calorieGoal / maxVal) * 120 },
                    ]}
                  />
                )}
              </View>
              <Text style={[styles.barLabel, { color: subColor }]} numberOfLines={2}>
                {week.label}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        {[
          { color: '#22c55e', label: 'On target' },
          { color: '#f59e0b', label: 'Under' },
          { color: '#ef4444', label: 'Over' },
        ].map((l) => (
          <View key={l.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: l.color }]} />
            <Text style={[styles.legendLabel, { color: subColor }]}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barValue: {
    fontSize: 9,
    marginBottom: 4,
    fontWeight: '600',
  },
  barTrack: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: Palette.primary,
    opacity: 0.6,
  },
  barLabel: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 12,
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 11,
  },
});
