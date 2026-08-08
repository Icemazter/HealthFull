/**
 * AdherenceHeatmap — a 10-week calendar heatmap showing daily goal adherence.
 * Green = hit goals, Yellow = within 15%, Red = missed, Gray = no data.
 */
import { Palette } from '@/constants/theme';
import { FoodEntry } from '@/hooks/use-food-manager';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface AdherenceHeatmapProps {
  isDark: boolean;
  foodHistory: FoodEntry[];
  calorieGoal: number;
}

type DayStatus = 'hit' | 'close' | 'missed' | 'empty';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKS = 10;

function getDateKey(date: Date): string {
  return date.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

function getDayStatus(
  logged: number,
  goal: number
): DayStatus {
  if (logged === 0) return 'empty';
  const ratio = logged / goal;
  if (ratio >= 0.85 && ratio <= 1.15) return 'hit';
  if (ratio >= 0.7 && ratio < 0.85) return 'close';
  if (ratio > 1.15 && ratio <= 1.3) return 'close';
  return 'missed';
}

const STATUS_COLORS: Record<DayStatus, string> = {
  hit: '#22c55e',
  close: '#f59e0b',
  missed: '#ef4444',
  empty: 'transparent',
};

const STATUS_LABELS: Record<DayStatus, string> = {
  hit: 'On target',
  close: 'Close',
  missed: 'Off track',
  empty: 'No data',
};

export function AdherenceHeatmap({ isDark, foodHistory, calorieGoal }: AdherenceHeatmapProps) {
  const { days, calsByDate } = useMemo(() => {
    // Build a map of date -> total calories
    const map: Record<string, number> = {};
    foodHistory.forEach((entry) => {
      const key = getDateKey(new Date(entry.timestamp));
      map[key] = (map[key] ?? 0) + entry.calories;
    });

    // Build grid: WEEKS weeks, starting from Sunday
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the start Sunday
    const startDay = new Date(today);
    startDay.setDate(today.getDate() - (today.getDay() + (WEEKS - 1) * 7));

    const grid: Array<{ dateKey: string; date: Date; status: DayStatus; isFuture: boolean }> = [];
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = new Date(startDay);
      d.setDate(startDay.getDate() + i);
      const key = getDateKey(d);
      const isFuture = d > today;
      const cals = map[key] ?? 0;
      const status: DayStatus = isFuture
        ? 'empty'
        : calorieGoal > 0
        ? getDayStatus(cals, calorieGoal)
        : 'empty';
      grid.push({ dateKey: key, date: d, status, isFuture });
    }

    return { days: grid, calsByDate: map };
  }, [foodHistory, calorieGoal]);

  const weeks: typeof days[] = [];
  for (let i = 0; i < WEEKS; i++) {
    weeks.push(days.slice(i * 7, (i + 1) * 7));
  }

  const bg = isDark ? '#1e293b' : '#f8fafc';
  const textColor = isDark ? '#f1f5f9' : '#111';
  const subColor = isDark ? '#64748b' : '#999';

  const hitCount = days.filter((d) => d.status === 'hit').length;
  const totalLogged = days.filter((d) => d.status !== 'empty' && !d.isFuture).length;

  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>📅 Adherence Heatmap</Text>
      <Text style={[styles.subtitle, { color: subColor }]}>
        {hitCount}/{totalLogged} days on target (last {WEEKS} weeks)
      </Text>

      {/* Day labels */}
      <View style={styles.dayLabelsRow}>
        {DAY_LABELS.map((l, i) => (
          <Text key={i} style={[styles.dayLabel, { color: subColor }]}>
            {l}
          </Text>
        ))}
      </View>

      {/* Grid: each row = one week */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day, di) => (
                <View
                  key={di}
                  style={[
                    styles.cell,
                    {
                      backgroundColor:
                        day.status === 'empty'
                          ? isDark
                            ? '#374151'
                            : '#e5e7eb'
                          : STATUS_COLORS[day.status],
                      opacity: day.isFuture ? 0.3 : 1,
                    },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        {(Object.entries(STATUS_LABELS) as [DayStatus, string][])
          .filter(([k]) => k !== 'empty')
          .map(([status, label]) => (
            <View key={status} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS[status] }]} />
              <Text style={[styles.legendLabel, { color: subColor }]}>{label}</Text>
            </View>
          ))}
      </View>
    </View>
  );
}

const CELL_SIZE = 18;
const CELL_GAP = 4;

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
    marginBottom: 12,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayLabel: {
    width: CELL_SIZE + CELL_GAP,
    fontSize: 11,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 4,
    marginRight: CELL_GAP,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 12,
  },
});
