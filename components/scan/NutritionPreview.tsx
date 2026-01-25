import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Palette } from '../../constants/theme';

export interface NutrientData {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface NutritionPreviewProps {
  nutrients: NutrientData;
  unit: 'g' | 'ml';
}

export const NutritionPreview = React.memo(function NutritionPreview({
  nutrients,
  unit,
}: NutritionPreviewProps) {
  return (
    <View style={styles.nutritionBox}>
      <View style={styles.nutritionHeader}>
        <Text style={styles.nutritionTitle}>per 100{unit}</Text>
        <Text style={styles.calorieValue}>{Math.round(nutrients.kcal)} kcal</Text>
      </View>
      <View style={styles.macrosGrid}>
        <MacroItem label="Protein" value={nutrients.protein} color={Palette.primary} />
        <MacroItem label="Carbs" value={nutrients.carbs} color={Palette.success} />
        <MacroItem label="Fat" value={nutrients.fat} color={Palette.warning} />
        <MacroItem label="Fiber" value={nutrients.fiber} color={Palette.brown} />
      </View>
    </View>
  );
});

interface MacroItemProps {
  label: string;
  value: number;
  color: string;
}

const MacroItem = React.memo(function MacroItem({ label, value, color }: MacroItemProps) {
  return (
    <View style={styles.macroItem}>
      <View style={[styles.macroIndicator, { backgroundColor: color }]} />
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{Math.round(value)}g</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  nutritionBox: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nutritionTitle: {
    color: Palette.gray,
    fontSize: 13,
    fontWeight: '500',
  },
  calorieValue: {
    color: Palette.darkGray,
    fontSize: 18,
    fontWeight: '700',
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  macroLabel: {
    color: Palette.gray,
    fontSize: 11,
    marginBottom: 2,
  },
  macroValue: {
    color: Palette.darkGray,
    fontSize: 14,
    fontWeight: '600',
  },
});
