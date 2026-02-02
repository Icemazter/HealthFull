import { IngredientSelector, RecipeBuilder, RecipeLogger, RecipesList } from '@/components/recipes';
import { ManualEntryModal } from '@/components/scan/ManualEntryModal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EditEntryModal } from '@/components/ui/edit-entry-modal';
import { FoodEntryCard } from '@/components/ui/food-entry-card';
import { Palette } from '@/constants/theme';
import { FoodEntry, useFoodManager } from '@/hooks/use-food-manager';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useRecipes } from '@/hooks/use-recipes';
import { useAppTheme } from '@/hooks/use-theme';
import { feedback } from '@/utils/feedback';
import { addIngredientToRecipe, Recipe, RecipeIngredient } from '@/utils/recipes';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const { recipes, addRecipe, deleteRecipe, updateRecipe, loadRecipes } = useRecipes();
  const [goals, setGoals] = usePersistedState(STORAGE_KEYS.MACRO_GOALS, { calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 30 });
  const [diabetesMode] = usePersistedState(STORAGE_KEYS.DIABETES_MODE, false);
  const [focusedMacro, setFocusedMacro] = useState<'calories' | 'protein' | 'carbs' | 'fat' | 'fiber'>('calories');
  const [showRecipeBuilder, setShowRecipeBuilder] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [showIngredientSelector, setShowIngredientSelector] = useState(false);
  const [showRecipeLogger, setShowRecipeLogger] = useState(false);
  const [selectedRecipeForLogging, setSelectedRecipeForLogging] = useState<Recipe | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showEditEntry, setShowEditEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const insets = useSafeAreaInsets();

  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      // Force re-load when screen is focused to ensure latest data
      setRefreshKey(k => k + 1);
    }, [])
  );

  // Normalize goals in case legacy data is missing fiber or values are stored as strings
  const normalizedGoals = useMemo(() => {
    const fallbackFiber = (goals as any).fiber ?? 30;
    return {
      calories: Number((goals as any).calories ?? goals.calories) || 0,
      protein: Number((goals as any).protein ?? goals.protein) || 0,
      carbs: Number((goals as any).carbs ?? goals.carbs) || 0,
      fat: Number((goals as any).fat ?? goals.fat) || 0,
      fiber: Number(fallbackFiber) || 0,
    };
  }, [goals]);

  const macroOptions = useMemo(() => ([
    { key: 'calories' as const, label: 'Calories', value: foodManager.totals.calories, goal: normalizedGoals.calories, unit: '', suffix: '' },
    { key: 'protein' as const, label: 'Protein', value: foodManager.totals.protein, goal: normalizedGoals.protein, unit: 'g', suffix: 'g' },
    { key: 'carbs' as const, label: 'Carbs', value: foodManager.totals.carbs, goal: normalizedGoals.carbs, unit: 'g', suffix: 'g' },
    { key: 'fat' as const, label: 'Fat', value: foodManager.totals.fat, goal: normalizedGoals.fat, unit: 'g', suffix: 'g' },
    { key: 'fiber' as const, label: 'Fiber', value: foodManager.totals.fiber ?? 0, goal: normalizedGoals.fiber, unit: 'g', suffix: 'g' },
  ]), [foodManager.totals, normalizedGoals]);

  const focused = macroOptions.find((m) => m.key === focusedMacro) ?? macroOptions[0];

  const percent = useMemo(() => {
    if (!focused.goal) return 0;
    return Math.min(Math.round((focused.value / focused.goal) * 100), 999);
  }, [focused]);

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
      'Delete all food entries for today?',
      () => foodManager.clearToday()
    );
  }, [foodManager]);

  const handleCreateRecipe = useCallback(async () => {
    const createAndOpen = async (name: string) => {
      const recipe = await addRecipe(name);
      setCurrentRecipe(recipe);
      setShowRecipeBuilder(true);
    };

    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Recipe Name',
        'Enter a name for your recipe',
        async (name: string) => {
          const trimmed = (name ?? '').trim();
          await createAndOpen(trimmed || 'New Recipe');
        }
      );
      return;
    }

    const fallbackName = `Recipe ${new Date().toLocaleDateString()}`;
    await createAndOpen(fallbackName);
  }, [addRecipe]);

  const handleSelectRecipe = useCallback((recipe: Recipe) => {
    setCurrentRecipe(recipe);
    setShowRecipeBuilder(true);
  }, []);

  const handleSaveRecipe = useCallback(
    async (recipe: Recipe) => {
      try {
        await updateRecipe(recipe);
        await feedback.success(`Recipe "${recipe.name}" saved!`);
        setShowRecipeBuilder(false);
        setCurrentRecipe(null);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await feedback.error(`Failed to save recipe: ${errorMsg}`, 'Save Error');
      }
    },
    [updateRecipe]
  );

  const handleRecipeDraftChange = useCallback(
    async (updatedRecipe: Recipe) => {
      setCurrentRecipe(updatedRecipe);
      await updateRecipe(updatedRecipe);
    },
    [updateRecipe]
  );

  const handleAddIngredient = useCallback(
    (ingredient: RecipeIngredient) => {
      // Haptic feedback
      Haptics.selectionAsync();
      
      // Show success toast
      feedback.success(`Added ${ingredient.name}!`);
      
      setCurrentRecipe(recipe => {
        if (!recipe) return null;
        const updated = addIngredientToRecipe(recipe, ingredient);
        updateRecipe(updated);
        return updated;
      });
      // Keep selector open for adding more ingredients
    },
    [updateRecipe]
  );

  useFocusEffect(
    useCallback(() => {
      const applyScannedIngredient = async () => {
        const scannedIng = await storage.get<RecipeIngredient | null>('TEMP_SCANNED_INGREDIENT', null);
        if (!scannedIng) return;

        await storage.set('TEMP_SCANNED_INGREDIENT', null);

        if (!currentRecipe) return;

        const updated = addIngredientToRecipe(currentRecipe, scannedIng);
        setCurrentRecipe(updated);
        await updateRecipe(updated);
        await feedback.success(`Added ${scannedIng.name}!`);
        
        // Reopen recipe builder and ingredient selector to return to recipe building context
        setShowRecipeBuilder(true);
        setShowIngredientSelector(true);
      };

      applyScannedIngredient();
    }, [currentRecipe, updateRecipe])
  );

  const handleDeleteRecipe = useCallback(
    async (recipeId: string) => {
      try {
        await deleteRecipe(recipeId);
        if (currentRecipe?.id === recipeId) {
          setCurrentRecipe(null);
          setShowRecipeBuilder(false);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await feedback.error(`Failed to delete recipe: ${errorMsg}`, 'Delete Error');
      }
    },
    [deleteRecipe, currentRecipe]
  );

  const handleRemoveEntry = useCallback((id: string) => {
    feedback.confirm(
      'Remove Entry',
      'Remove this food item?',
      () => foodManager.removeEntry(id)
    );
  }, [foodManager]);

  const handleToggleFavorite = useCallback((item: FoodEntry) => {
    foodManager.toggleFavorite(item);
  }, [foodManager]);

  const handleEditEntry = useCallback((item: FoodEntry) => {
    setEditingEntry(item);
    setShowEditEntry(true);
  }, []);

  const handleSaveEditedEntry = useCallback(async (updatedEntry: FoodEntry) => {
    // Remove old entry and add updated one
    foodManager.removeEntry(updatedEntry.id);
    await foodManager.addEntry(updatedEntry);
    setShowEditEntry(false);
    setEditingEntry(null);
    setRefreshKey(k => k + 1);
    await feedback.success('Entry updated!');
  }, [foodManager]);

  const handleLogRecipe = useCallback(
    async (scaledNutrition: { calories: number; protein: number; carbs: number; fat: number; fiber: number; mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' }) => {
      if (!selectedRecipeForLogging) return;
      
      const recipeName = selectedRecipeForLogging.name;
      const entry: FoodEntry = {
        id: `recipe_${Date.now()}`,
        name: recipeName,
        calories: scaledNutrition.calories,
        protein: scaledNutrition.protein,
        carbs: scaledNutrition.carbs,
        fat: scaledNutrition.fat,
        fiber: scaledNutrition.fiber,
        timestamp: Date.now(),
        mealType: scaledNutrition.mealType,
      };
      
      await foodManager.addEntry(entry);
      setShowRecipeLogger(false);
      setSelectedRecipeForLogging(null);
      setRefreshKey(k => k + 1); // Trigger refresh to show new entry
      await feedback.success(`${recipeName} logged!`);
    },
    [selectedRecipeForLogging, foodManager]
  );

  return (
    <>
      <ScrollView style={[styles.container, isDark && styles.containerDark]}>
      <ThemedView style={[styles.header, isDark && styles.headerDark, { paddingTop: Math.max(insets.top, 16) }]}>
        <ThemedText type="title" style={[styles.headerTitle, isDark && styles.headerTitleDark]}>Today's Nutrition</ThemedText>
        <Pressable style={styles.themeToggle} onPress={toggleTheme}>
          <Text style={styles.themeToggleIcon}>{isDark ? '🌙' : '☀️'}</Text>
        </Pressable>
      </ThemedView>

      <ThemedView style={[styles.totalsCard, isDark && styles.totalsCardDark]}>
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>{focused.label}</Text>
            <Text style={styles.totalValue}>
              {`${Math.round(focused.value)}${focused.suffix && ` ${focused.suffix}`} / ${focused.goal || 0}${focused.unit}`}
            </Text>
          </View>
          <Text style={styles.percentageText}>{percent}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar,
              { width: `${Math.min((focused.goal ? (focused.value / focused.goal) * 100 : 0), 100)}%` },
            ]} 
          />
        </View>
        
        <View style={styles.macrosRow}>
          {macroOptions.map((macro) => (
            <Pressable
              key={macro.key}
              style={[styles.macroItem, focusedMacro === macro.key && styles.macroItemActive]}
              onPress={() => setFocusedMacro(macro.key)}>
              <Text style={[styles.macroLabel, focusedMacro === macro.key && styles.macroLabelActive]}>{macro.label}</Text>
              <Text style={[styles.macroValue, focusedMacro === macro.key && styles.macroValueHighlight]}>
                {Math.round(macro.value)}{macro.unit}
              </Text>
              <Text style={styles.macroGoal}>/{macro.goal}{macro.unit}</Text>
            </Pressable>
          ))}
        </View>
      </ThemedView>

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

      {/* Recipes Section */}
      <RecipesList
        recipes={recipes}
        onSelectRecipe={handleSelectRecipe}
        onDeleteRecipe={handleDeleteRecipe}
        onCreateNew={handleCreateRecipe}
        onLogRecipe={(recipe) => {
          setSelectedRecipeForLogging(recipe);
          setShowRecipeLogger(true);
        }}
      />

      <ThemedView style={styles.listContainer}>
        <View style={styles.listHeader}>
          <ThemedText type="subtitle" style={styles.listTitle}>Food Log</ThemedText>
          <Pressable 
            style={styles.addEntryButton}
            onPress={() => setShowManualEntry(true)}>
            <Text style={styles.addEntryButtonText}>+ Add</Text>
          </Pressable>
        </View>
        {foodManager.entries.length === 0 ? (
          <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>No entries yet. Tap "Scan Barcode" to add food.</Text>
        ) : (
          groupedEntries.map((section) => (
            <View key={section.meal} style={styles.mealSection}>
              <View style={styles.mealHeaderRow}>
                <Text style={[styles.mealHeader, isDark && styles.mealHeaderDark]}>{section.meal}</Text>
                <Text style={[styles.mealCount, isDark && styles.mealCountDark]}>{section.items.length} item{section.items.length > 1 ? 's' : ''}</Text>
              </View>
              {section.items.map((item) => (
                <FoodEntryCard
                  key={item.id}
                  item={item}
                  isDark={isDark}
                  diabetesMode={diabetesMode}
                  isFavorite={foodManager.isFavorite(item)}
                  onRemove={handleRemoveEntry}
                  onToggleFavorite={handleToggleFavorite}
                  onEdit={handleEditEntry}
                />
              ))}
            </View>
          ))
        )}

        {currentRecipe && (
          <>
            <RecipeBuilder
              visible={showRecipeBuilder}
              recipe={currentRecipe}
              onSave={handleSaveRecipe}
              onRecipeChange={handleRecipeDraftChange}
              onCancel={async () => {
                // Delete recipe if it's empty (no ingredients)
                if (currentRecipe && currentRecipe.ingredients.length === 0) {
                  await deleteRecipe(currentRecipe.id);
                }
                setShowRecipeBuilder(false);
                setCurrentRecipe(null);
              }}
              onAddIngredientPressed={() => setShowIngredientSelector(true)}
            />
            <IngredientSelector
              visible={showIngredientSelector}
              onSelect={handleAddIngredient}
              onCancel={() => setShowIngredientSelector(false)}
              onScanPressed={() => {
                setShowIngredientSelector(false);
                setShowRecipeBuilder(false);
                router.push({
                  pathname: '/scan',
                  params: { mode: 'recipe', recipeId: currentRecipe?.id }
                });
              }}
            />
          </>
        )}

        {selectedRecipeForLogging && (
          <RecipeLogger
            visible={showRecipeLogger}
            recipe={selectedRecipeForLogging}
            onLog={handleLogRecipe}
            onCancel={() => {
              setShowRecipeLogger(false);
              setSelectedRecipeForLogging(null);
            }}
          />
        )}
      </ThemedView>

      <ManualEntryModal
        visible={showManualEntry}
        onCancel={() => setShowManualEntry(false)}
        onAdd={async (entry) => {
          const newEntry: FoodEntry = {
            id: `manual_${Date.now()}`,
            name: entry.name,
            calories: entry.calories,
            protein: entry.protein,
            carbs: entry.carbs,
            fat: entry.fat,
            fiber: entry.fiber,
            timestamp: Date.now(),
            mealType: entry.mealType,
          };
          
          await foodManager.addEntry(newEntry);
          setShowManualEntry(false);
          setRefreshKey(k => k + 1); // Trigger refresh to show new entry
          await feedback.success(`${entry.name} added!`);
        }}
      />
      <EditEntryModal
        visible={showEditEntry}
        entry={editingEntry}
        onCancel={() => {
          setShowEditEntry(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveEditedEntry}
      />
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
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 12,
    justifyContent: 'space-between',
  },
  macroItem: {
    flexGrow: 1,
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    borderWidth: 0,
    marginBottom: 6,
  },
  macroItemActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  macroLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
    fontWeight: '500',
  },
  macroLabelActive: {
    color: 'rgba(255,255,255,0.95)',
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
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  addEntryButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addEntryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
