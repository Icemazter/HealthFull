import { FoodEntry } from '@/hooks/use-food-manager';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FoodEntryCard } from './food-entry-card';

interface MealSectionProps {
  meal: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Other';
  items: FoodEntry[];
  isDark: boolean;
  diabetesMode: boolean;
  isFavorite: (item: FoodEntry) => boolean;
  onRemove: (id: string) => void;
  onToggleFavorite: (item: FoodEntry) => void;
}

export const MealSection = React.memo(
  ({
    meal,
    items,
    isDark,
    diabetesMode,
    isFavorite,
    onRemove,
    onToggleFavorite,
  }: MealSectionProps) => {
    return (
      <View style={styles.mealSection}>
        <View style={styles.mealHeaderRow}>
          <Text style={[styles.mealHeader, isDark && styles.mealHeaderDark]}>
            {meal}
          </Text>
          <Text style={[styles.mealCount, isDark && styles.mealCountDark]}>
            {items.length} item{items.length > 1 ? 's' : ''}
          </Text>
        </View>
        {items.map((item) => (
          <FoodEntryCard
            key={item.id}
            item={item}
            isDark={isDark}
            diabetesMode={diabetesMode}
            isFavorite={isFavorite(item)}
            onRemove={onRemove}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </View>
    );
  },
  (prev, next) => {
    // Skip re-render if:
    // - same meal type
    // - same number of items
    // - same theme
    // - same mode
    return (
      prev.meal === next.meal &&
      prev.items.length === next.items.length &&
      prev.isDark === next.isDark &&
      prev.diabetesMode === next.diabetesMode
    );
  }
);

MealSection.displayName = 'MealSection';

const styles = StyleSheet.create({
  mealSection: {
    marginVertical: 8,
  },
  mealHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mealHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  mealHeaderDark: {
    color: '#e5e5e5',
  },
  mealCount: {
    fontSize: 13,
    color: '#9ca3af',
  },
  mealCountDark: {
    color: '#6b7280',
  },
});
