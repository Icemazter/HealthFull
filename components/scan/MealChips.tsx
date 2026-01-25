import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Palette } from '../../constants/theme';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export const MEAL_OPTIONS: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

interface MealChipsProps {
  selected: MealType;
  onSelect: (meal: MealType) => void;
}

export const MealChips = React.memo(function MealChips({
  selected,
  onSelect,
}: MealChipsProps) {
  return (
    <View style={styles.mealContainer}>
      <Text style={styles.sectionLabel}>Meal</Text>
      <View style={styles.mealChips}>
        {MEAL_OPTIONS.map((meal) => (
          <Pressable
            key={meal}
            style={[styles.mealChip, selected === meal && styles.mealChipActive]}
            onPress={() => onSelect(meal)}>
            <Text style={[styles.mealChipText, selected === meal && styles.mealChipTextActive]}>
              {meal}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  mealContainer: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: Palette.darkGray,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  mealChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Palette.lightGray2,
  },
  mealChipActive: {
    backgroundColor: Palette.primary,
  },
  mealChipText: {
    color: Palette.gray,
    fontSize: 14,
    fontWeight: '600',
  },
  mealChipTextActive: {
    color: '#fff',
  },
});
