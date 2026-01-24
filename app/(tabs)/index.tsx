import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';
import { FoodEntry, useFoodManager } from '@/hooks/use-food-manager';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useAppTheme } from '@/hooks/use-theme';
import { feedback } from '@/utils/feedback';
import { STORAGE_KEYS } from '@/utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const mealOrder: Array<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Other'> = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
  'Other',
];

export default function HomeScreen() {
  const { isDark, toggleTheme } = useAppTheme();
  const foodManager = useFoodManager();
  const [goals, setGoals] = usePersistedState({ calories: 2000, protein: 150, carbs: 200, fat: 65 }, STORAGE_KEYS.MACRO_GOALS);
  const [diabetesMode] = usePersistedState(false, STORAGE_KEYS.DIABETES_MODE);
  const [focusedMacro, setFocusedMacro] = useState<'calories' | 'protein' | 'carbs' | 'fat'>('calories');
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      // Force re-render when screen is focused to update entries
    }, [])
  );

  const groupedEntries = useMemo(() => {
    const groups: Record<string, FoodEntry[]> = {};
    foodManager.entries.forEach((entry) => {
      const key = entry.mealType && mealOrder.includes(entry.mealType) ? entry.mealType : 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });

    return mealOrder
      .map((meal) => ({ meal, items: groups[meal] || [] }))
      .filter((section) => section.items.length > 0);
  }, [foodManager.entries]);

  const handleClearToday = useCallback(() => {
    feedback.confirm(
      'Clear Today\'s Entries',
      'This will remove all food items logged today. This cannot be undone.',
      () => foodManager.clearToday()
    );
  }, [foodManager]);

  const handleRemoveEntry = useCallback((id: string) => {
    feedback.confirm(
      'Remove Entry',
      'Remove this food item?',
      () => foodManager.removeEntry(id)
    );
  }, [foodManager]);

  return (
    <>
      <ScrollView style={[styles.container, isDark && styles.containerDark]}>
      <ThemedView style={[styles.header, isDark && styles.headerDark, { paddingTop: Math.max(insets.top, 16) }]}>
        <ThemedText type="title" style={[styles.headerTitle, isDark && styles.headerTitleDark]}>Today's Nutrition</ThemedText>
        <Pressable style={styles.themeToggle} onPress={toggleTheme}>
          <Text style={styles.themeToggleIcon}>{isDark ? '☀️' : '🌙'}</Text>
        </Pressable>
      </ThemedView>

      <ThemedView style={[styles.totalsCard, isDark && styles.totalsCardDark]}>
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>
              {focusedMacro === 'calories' && 'Calories'}
              {focusedMacro === 'protein' && 'Protein'}
              {focusedMacro === 'carbs' && 'Carbs'}
              {focusedMacro === 'fat' && 'Fat'}
            </Text>
            <Text style={styles.totalValue}>
              {focusedMacro === 'calories' && `${Math.round(foodManager.totals.calories)} / ${goals.calories}`}
              {focusedMacro === 'protein' && `${Math.round(foodManager.totals.protein)}g / ${goals.protein}g`}
              {focusedMacro === 'carbs' && `${Math.round(foodManager.totals.carbs)}g / ${goals.carbs}g`}
              {focusedMacro === 'fat' && `${Math.round(foodManager.totals.fat)}g / ${goals.fat}g`}
            </Text>
          </View>
          <Text style={styles.percentageText}>
            {focusedMacro === 'calories' && `${Math.round((foodManager.totals.calories / goals.calories) * 100)}%`}
            {focusedMacro === 'protein' && `${Math.round((foodManager.totals.protein / goals.protein) * 100)}%`}
            {focusedMacro === 'carbs' && `${Math.round((foodManager.totals.carbs / goals.carbs) * 100)}%`}
            {focusedMacro === 'fat' && `${Math.round((foodManager.totals.fat / goals.fat) * 100)}%`}
          </Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar,
              focusedMacro === 'calories' && { width: `${Math.min((foodManager.totals.calories / goals.calories) * 100, 100)}%` },
              focusedMacro === 'protein' && { width: `${Math.min((foodManager.totals.protein / goals.protein) * 100, 100)}%` },
              focusedMacro === 'carbs' && { width: `${Math.min((foodManager.totals.carbs / goals.carbs) * 100, 100)}%` },
              focusedMacro === 'fat' && { width: `${Math.min((foodManager.totals.fat / goals.fat) * 100, 100)}%` },
            ]} 
          />
        </View>
        
        <View style={styles.macrosRow}>
          {focusedMacro !== 'protein' && (
            <Pressable 
              style={styles.macroItem}
              onPress={() => setFocusedMacro('protein')}>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>{Math.round(foodManager.totals.protein)}g</Text>
              <Text style={styles.macroGoal}>/{goals.protein}g</Text>
            </Pressable>
          )}
          {focusedMacro !== 'carbs' && (
            <Pressable 
              style={styles.macroItem}
              onPress={() => setFocusedMacro('carbs')}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={[styles.macroValue, diabetesMode && styles.macroValueHighlight]}>{Math.round(foodManager.totals.carbs)}g</Text>
              <Text style={styles.macroGoal}>/{goals.carbs}g</Text>
            </Pressable>
          )}
          {focusedMacro !== 'fat' && (
            <Pressable 
              style={styles.macroItem}
              onPress={() => setFocusedMacro('fat')}>
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={styles.macroValue}>{Math.round(foodManager.totals.fat)}g</Text>
              <Text style={styles.macroGoal}>/{goals.fat}g</Text>
            </Pressable>
          )}
          {focusedMacro !== 'calories' && (
            <Pressable 
              style={styles.macroItem}
              onPress={() => setFocusedMacro('calories')}>
              <Text style={styles.macroLabel}>Calories</Text>
              <Text style={styles.macroValue}>{Math.round(foodManager.totals.calories)}</Text>
              <Text style={styles.macroGoal}>/{goals.calories}</Text>
            </Pressable>
          )}
        </View>
      </ThemedView>

      {/* Water Tracker */}
      <View style={[styles.waterCard, isDark && styles.waterCardDark]}>
        <Text style={[styles.waterTitle, isDark && styles.waterTitleDark]}>💧 Water Intake</Text>
        <Text style={[styles.waterAmount, isDark && styles.waterAmountDark]}>{foodManager.water}ml / 2000ml</Text>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar,
              styles.waterProgressBar,
              { width: `${Math.min((foodManager.water / 2000) * 100, 100)}%` }
            ]} 
          />
        </View>
        <View style={styles.waterButtons}>
          <Pressable style={[styles.waterButton, isDark && styles.waterButtonDark]} onPress={() => foodManager.addWater(250)}>
            <Text style={[styles.waterButtonText, isDark && styles.waterButtonTextDark]}>+250ml</Text>
          </Pressable>
          <Pressable style={[styles.waterButton, isDark && styles.waterButtonDark]} onPress={() => foodManager.addWater(500)}>
            <Text style={[styles.waterButtonText, isDark && styles.waterButtonTextDark]}>+500ml</Text>
          </Pressable>
          <Pressable style={[styles.waterButton, isDark && styles.waterButtonDark]} onPress={() => foodManager.addWater(-250)}>
            <Text style={[styles.waterButtonText, isDark && styles.waterButtonTextDark]}>-250ml</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        style={[styles.scanButton, isDark && styles.scanButtonDark]}
        onPress={() => router.push('/scan')}>
        <Text style={styles.scanButtonText}>Scan Barcode</Text>
      </Pressable>

      {foodManager.entries.length > 0 && (
        <Pressable
          style={[styles.clearButton, isDark && styles.clearButtonDark]}
          onPress={handleClearToday}>
          <Text style={[styles.clearButtonText, isDark && styles.clearButtonTextDark]}>Clear Today's Entries</Text>
        </Pressable>
      )}

      {/* Favorites Section */}
      {foodManager.favorites.length > 0 && (
        <ThemedView style={[styles.favoritesSection, isDark && styles.favoritesSectionDark]}>
          <Text style={[styles.favoritesTitle, isDark && styles.favoritesTitleDark]}>⭐ Quick Add</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.favoritesScroll}>
            {foodManager.favorites.map((fav) => (
              <Pressable
                key={fav.id}
                style={[styles.favoriteChip, isDark && styles.favoriteChipDark]}
                onPress={() => foodManager.addFavoriteToday(fav)}>
                <Text style={styles.favoriteChipName}>{fav.name}</Text>
                <Text style={styles.favoriteChipCals}>{Math.round(fav.calories)} cal</Text>
              </Pressable>
            ))}
          </ScrollView>
        </ThemedView>
      )}

      <ThemedView style={styles.listContainer}>
        <ThemedText type="subtitle" style={styles.listTitle}>Food Log</ThemedText>
        {foodManager.entries.length === 0 ? (
          <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>No entries yet. Tap "Scan Barcode" to add food.</Text>
        ) : (
          groupedEntries.map((section) => (
            <View key={section.meal} style={styles.mealSection}>
              <View style={styles.mealHeaderRow}>
                <Text style={[styles.mealHeader, isDark && styles.mealHeaderDark]}>{section.meal}</Text>
                <Text style={[styles.mealCount, isDark && styles.mealCountDark]}>{section.items.length} item{section.items.length > 1 ? 's' : ''}</Text>
              </View>
              {section.items.map((item) => {
                const isFav = foodManager.isFavorite(item);
                return (
                  <View key={item.id} style={[styles.entryCard, isDark && styles.entryCardDark]}>
                    <View style={styles.entryContent}>
                      <Text style={[styles.entryName, isDark && styles.entryNameDark]}>{item.name}</Text>
                      {diabetesMode ? (
                        <Text style={[styles.entryMacros, isDark && styles.entryMacrosDark]}>
                          <Text style={styles.carbsHighlight}>🍞 {Math.round(item.carbs)}g carbs</Text> • {Math.round(item.calories)} cal • P: {Math.round(item.protein)}g • F: {Math.round(item.fat)}g
                        </Text>
                      ) : (
                        <Text style={[styles.entryMacros, isDark && styles.entryMacrosDark]}>
                          {Math.round(item.calories)} cal • P: {Math.round(item.protein)}g • C: {Math.round(item.carbs)}g • F: {Math.round(item.fat)}g
                        </Text>
                      )}
                    </View>
                    <View style={styles.entryActions}>
                      <Pressable
                        style={[styles.favoriteButton, isDark && styles.favoriteButtonDark]}
                        onPress={() => foodManager.toggleFavorite(item)}>
                        <Text style={styles.favoriteButtonText}>{isFav ? '⭐' : '☆'}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.removeButton, isDark && styles.removeButtonDark]}
                        onPress={() => handleRemoveEntry(item.id)}>
                        <Text style={[styles.removeButtonText, isDark && styles.removeButtonTextDark]}>✕</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ThemedView>
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
  totalsCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: Palette.primary,
    borderWidth: 0,
  },
  totalsCardDark: {
    backgroundColor: '#1e3a8a',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Palette.white,
  },
  percentageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.9)',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Palette.white,
    borderRadius: 6,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    borderWidth: 0,
  },
  macroLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
    fontWeight: '500',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Palette.white,
  },
  macroValueHighlight: {
    fontSize: 22,
    color: '#fbbf24',
  },
  macroGoal: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  waterCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: Palette.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  waterCardDark: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  waterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Palette.primary,
    marginBottom: 12,
  },
  waterTitleDark: {
    color: '#60a5fa',
  },
  waterAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Palette.primary,
    marginBottom: 12,
  },
  waterAmountDark: {
    color: '#60a5fa',
  },
  waterProgressBar: {
    backgroundColor: '#60a5fa',
  },
  waterButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  waterButton: {
    flex: 1,
    backgroundColor: Palette.lightGray2,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  waterButtonDark: {
    backgroundColor: '#262626',
    borderColor: '#404040',
  },
  waterButtonText: {
    color: Palette.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  waterButtonTextDark: {
    color: '#60a5fa',
  },
  scanButton: {
    backgroundColor: Palette.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  scanButtonDark: {
    backgroundColor: '#1e3a8a',
  },
  scanButtonText: {
    color: Palette.white,
    fontSize: 17,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#ffe5e5',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  clearButtonDark: {
    backgroundColor: '#4a1a1a',
    borderColor: '#662222',
  },
  clearButtonText: {
    color: Palette.error,
    fontSize: 15,
    fontWeight: '600',
  },
  clearButtonTextDark: {
    color: '#ff6b6b',
  },
  mealSection: {
    marginBottom: 10,
  },
  mealHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  mealHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.brown,
  },
  mealHeaderDark: {
    color: '#9ca3af',
  },
  mealCount: {
    fontSize: 13,
    color: Palette.gray,
  },
  mealCountDark: {
    color: '#6b7280',
  },
  entryCard: {
    padding: 14,
    backgroundColor: Palette.white,
    borderRadius: 12,
    marginBottom: 10,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  entryCardDark: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  entryContent: {
    flex: 1,
  },
  entryName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  entryNameDark: {
    color: '#e5e5e5',
  },
  entryMacros: {
    fontSize: 13,
    color: '#888',
  },
  entryMacrosDark: {
    color: '#9ca3af',
  },
  carbsHighlight: {
    fontWeight: '700',
    color: '#f59e0b',
  },
  entryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff3cd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButtonDark: {
    backgroundColor: '#4a3a0a',
  },
  favoriteButtonText: {
    fontSize: 18,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffe5e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonDark: {
    backgroundColor: '#4a1a1a',
  },
  removeButtonText: {
    color: Palette.error,
    fontSize: 18,
    fontWeight: 'bold',
  },
  removeButtonTextDark: {
    color: '#ff6b6b',
  },
  favoritesSection: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fffbf0',
  },
  favoritesSectionDark: {
    backgroundColor: '#3a2a0a',
  },
  favoritesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  favoritesTitleDark: {
    color: '#ffd700',
  },
  favoritesScroll: {
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  favoriteChip: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ffd700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteChipDark: {
    backgroundColor: '#1a1a1a',
    borderColor: '#ffd700',
  },
  favoriteChipName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  favoriteChipCals: {
    fontSize: 11,
    color: '#666',
  },
  listContainer: {
    flex: 1,
    paddingBottom: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  listTitle: {
    marginBottom: 12,
    marginLeft: 16,
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: Palette.gray,
    fontSize: 14,
    marginTop: 24,
  },
  emptyTextDark: {
    color: '#9ca3af',
  },
});
