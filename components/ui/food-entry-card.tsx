import { Palette } from '@/constants/theme';
import { FoodEntry } from '@/hooks/use-food-manager';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface FoodEntryCardProps {
  item: FoodEntry;
  isDark: boolean;
  diabetesMode: boolean;
  isFavorite: boolean;
  onRemove: (id: string) => void;
  onToggleFavorite: (item: FoodEntry) => void;
}

export const FoodEntryCard = React.memo(
  ({
    item,
    isDark,
    diabetesMode,
    isFavorite,
    onRemove,
    onToggleFavorite,
  }: FoodEntryCardProps) => {
    return (
      <View style={[styles.entryCard, isDark && styles.entryCardDark]}>
        <View style={styles.entryContent}>
          <Text style={[styles.entryName, isDark && styles.entryNameDark]}>
            {item.name}
          </Text>
          {diabetesMode ? (
            <Text style={[styles.entryMacros, isDark && styles.entryMacrosDark]}>
              <Text style={styles.carbsHighlight}>
                🍞 {Math.round(item.carbs)}g carbs
              </Text>{' '}
              • {Math.round(item.calories)} cal • P: {Math.round(item.protein)}
              g • F: {Math.round(item.fat)}g • Fi:{' '}
              {Math.round(item.fiber ?? 0)}
              g
            </Text>
          ) : (
            <Text style={[styles.entryMacros, isDark && styles.entryMacrosDark]}>
              {Math.round(item.calories)} cal • P:{' '}
              {Math.round(item.protein)}
              g • C: {Math.round(item.carbs)}g • F:{' '}
              {Math.round(item.fat)}
              g • Fi: {Math.round(item.fiber ?? 0)}g
            </Text>
          )}
        </View>
        <View style={styles.entryActions}>
          <Pressable
            style={[styles.favoriteButton, isDark && styles.favoriteButtonDark]}
            onPress={() => onToggleFavorite(item)}>
            <Text style={styles.favoriteButtonText}>
              {isFavorite ? '⭐' : '☆'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.removeButton, isDark && styles.removeButtonDark]}
            onPress={() => onRemove(item.id)}>
            <Text style={[styles.removeButtonText, isDark && styles.removeButtonTextDark]}>
              ✕
            </Text>
          </Pressable>
        </View>
      </View>
    );
  },
  (prev, next) => {
    // Return true if props are equal (skip re-render), false if different (re-render)
    return (
      prev.item.id === next.item.id &&
      prev.isFavorite === next.isFavorite &&
      prev.diabetesMode === next.diabetesMode &&
      prev.isDark === next.isDark
    );
  }
);

FoodEntryCard.displayName = 'FoodEntryCard';

const styles = StyleSheet.create({
  entryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: Palette.primary,
  },
  entryCardDark: {
    backgroundColor: '#1e293b',
  },
  entryContent: {
    flex: 1,
  },
  entryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  entryNameDark: {
    color: '#f1f5f9',
  },
  entryMacros: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  entryMacrosDark: {
    color: '#cbd5e1',
  },
  carbsHighlight: {
    color: Palette.orange,
    fontWeight: '700',
  },
  entryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButtonDark: {
    backgroundColor: '#334155',
  },
  favoriteButtonText: {
    fontSize: 16,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonDark: {
    backgroundColor: '#7f1d1d',
  },
  removeButtonText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '600',
  },
  removeButtonTextDark: {
    color: '#fca5a5',
  },
});
