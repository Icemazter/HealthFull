import { Palette } from '@/constants/theme';
import {
    adjustMealPrepIngredientWeight,
    calculateMealPrepNutrition,
    generateMealPreps,
    MealPrep,
    Recipe,
} from '@/utils/recipes';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MealPrepCreatorProps {
  visible: boolean;
  recipe: Recipe;
  onSave: (mealpreps: MealPrep[]) => void;
  onCancel: () => void;
}

const isWeb = Platform.OS === 'web';

export const MealPrepCreator = React.memo(function MealPrepCreator({
  visible,
  recipe,
  onSave,
  onCancel,
}: MealPrepCreatorProps) {
  const insets = useSafeAreaInsets();
  const [boxCount, setBoxCount] = useState(recipe.mealpreps?.length?.toString() || '3');
  const [mealpreps, setMealpreps] = useState<MealPrep[]>(
    recipe.mealpreps ?? []
  );
  const [expandedBox, setExpandedBox] = useState<number | null>(null);
  const [editingWeight, setEditingWeight] = useState<{ boxId: string; ingredientId: string; value: string } | null>(null);

  // Sync state when modal opens or recipe changes
  useEffect(() => {
    if (visible) {
      setMealpreps(recipe.mealpreps ?? []);
      setBoxCount(recipe.mealpreps?.length?.toString() || '3');
      setExpandedBox(null);
      setEditingWeight(null);
    }
  }, [visible, recipe]);

  const parsedBoxCount = parseInt(boxCount) || 0;

  const handleGenerate = useCallback(() => {
    if (parsedBoxCount < 1 || parsedBoxCount > 20) {
      Alert.alert('Invalid', 'Enter between 1 and 20 boxes');
      return;
    }

    if (recipe.ingredients.length === 0) {
      Alert.alert('No Ingredients', 'Add ingredients to the recipe first');
      return;
    }

    const generated = generateMealPreps(recipe, parsedBoxCount);
    setMealpreps(generated);
    setExpandedBox(null);

    if (!isWeb) {
      Haptics.selectionAsync();
    }
  }, [recipe, parsedBoxCount]);

  const handleAdjustWeight = useCallback(
    (boxId: string, ingredientId: string, newWeightStr: string) => {
      const newWeight = parseFloat(newWeightStr);
      if (isNaN(newWeight) || newWeight < 0) return;

      const originalIngredient = recipe.ingredients.find(
        (ing) => ing.id === ingredientId
      );
      if (!originalIngredient) return;

      setMealpreps((prev) =>
        prev.map((mp) =>
          mp.id === boxId
            ? adjustMealPrepIngredientWeight(mp, ingredientId, newWeight, originalIngredient)
            : mp
        )
      );
    },
    [recipe.ingredients]
  );

  const handleDeleteBox = useCallback(
    (boxId: string) => {
      Alert.alert('Remove Box', 'Remove this mealprep box?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setMealpreps((prev) => {
              const filtered = prev.filter((mp) => mp.id !== boxId);
              // Renumber boxes
              return filtered.map((mp, i) => ({
                ...mp,
                boxNumber: i + 1,
                label: `Box ${i + 1}`,
              }));
            });
          },
        },
      ]);
    },
    []
  );

  const handleSave = useCallback(() => {
    if (mealpreps.length === 0) {
      Alert.alert('No Mealpreps', 'Generate mealprep boxes first');
      return;
    }

    if (!isWeb) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    onSave(mealpreps);
  }, [mealpreps, onSave]);

  const handleClearAll = useCallback(() => {
    Alert.alert('Clear Mealpreps', 'Remove all mealprep boxes from this recipe?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: () => {
          setMealpreps([]);
          onSave([]);
        },
      },
    ]);
  }, [onSave]);

  // Summary of total allocated vs recipe total
  const allocationSummary = useMemo(() => {
    if (mealpreps.length === 0) return null;
    const allocated = mealpreps.reduce((sum, mp) => sum + mp.totalWeightInGrams, 0);
    return {
      allocated: Math.round(allocated),
      total: Math.round(recipe.totalWeightInGrams),
      percentage: Math.round((allocated / recipe.totalWeightInGrams) * 100),
    };
  }, [mealpreps, recipe.totalWeightInGrams]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} hitSlop={10}>
            <Text style={styles.closeButton}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Mealprep Boxes</Text>
          <Pressable style={styles.saveButton} onPress={handleSave} hitSlop={10}>
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Recipe info */}
          <View style={styles.recipeInfoCard}>
            <Text style={styles.recipeName}>{recipe.name}</Text>
            <Text style={styles.recipeDetail}>
              {recipe.ingredients.length} ingredients · {Math.round(recipe.totalWeightInGrams)}g total
            </Text>
          </View>

          {/* Box count selector */}
          <View style={styles.section}>
            <Text style={styles.label}>Number of Boxes</Text>
            <View style={styles.boxCountRow}>
              <Pressable
                style={styles.boxCountButton}
                onPress={() => {
                  const n = Math.max(1, parsedBoxCount - 1);
                  setBoxCount(n.toString());
                }}>
                <Text style={styles.boxCountButtonText}>−</Text>
              </Pressable>
              <TextInput
                style={styles.boxCountInput}
                value={boxCount}
                onChangeText={setBoxCount}
                keyboardType="number-pad"
                textAlign="center"
              />
              <Pressable
                style={styles.boxCountButton}
                onPress={() => {
                  const n = Math.min(20, parsedBoxCount + 1);
                  setBoxCount(n.toString());
                }}>
                <Text style={styles.boxCountButtonText}>+</Text>
              </Pressable>
            </View>
            <Pressable style={styles.generateButton} onPress={handleGenerate}>
              <Text style={styles.generateButtonText}>
                {mealpreps.length > 0 ? 'Regenerate Boxes' : 'Create Boxes'}
              </Text>
            </Pressable>
          </View>

          {/* Allocation summary */}
          {allocationSummary && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Allocation</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Distributed</Text>
                <Text style={styles.summaryValue}>
                  {allocationSummary.allocated}g / {allocationSummary.total}g ({allocationSummary.percentage}%)
                </Text>
              </View>
              <View style={styles.summaryBarBg}>
                <View
                  style={[
                    styles.summaryBarFill,
                    { width: `${Math.min(allocationSummary.percentage, 100)}%` },
                    allocationSummary.percentage > 100 && styles.summaryBarOver,
                  ]}
                />
              </View>
              {allocationSummary.percentage > 100 && (
                <Text style={styles.overWarning}>
                  Over-allocated by {allocationSummary.allocated - allocationSummary.total}g
                </Text>
              )}
            </View>
          )}

          {/* Mealprep boxes */}
          {mealpreps.length > 0 && (
            <View style={styles.section}>
              <View style={styles.boxesHeader}>
                <Text style={styles.label}>{mealpreps.length} Boxes</Text>
                <Pressable onPress={handleClearAll} hitSlop={8}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </Pressable>
              </View>

              {mealpreps.map((mp) => {
                const nutrition = calculateMealPrepNutrition(mp);
                const isExpanded = expandedBox === mp.boxNumber;

                return (
                  <View key={mp.id} style={styles.boxCard}>
                    <Pressable
                      style={styles.boxHeader}
                      onPress={() =>
                        setExpandedBox(isExpanded ? null : mp.boxNumber)
                      }>
                      <View style={styles.boxHeaderLeft}>
                        <Text style={styles.boxLabel}>{mp.label}</Text>
                        <Text style={styles.boxWeight}>
                          {Math.round(mp.totalWeightInGrams)}g
                        </Text>
                      </View>
                      <View style={styles.boxHeaderRight}>
                        <Text style={styles.boxCals}>
                          {Math.round(nutrition.calories)} kcal
                        </Text>
                        <Text style={styles.boxChevron}>
                          {isExpanded ? '▾' : '›'}
                        </Text>
                      </View>
                    </Pressable>

                    {/* Compact nutrition row */}
                    <View style={styles.boxNutritionRow}>
                      <Text style={styles.boxMacro}>
                        P: {nutrition.protein.toFixed(1)}g
                      </Text>
                      <Text style={styles.boxMacro}>
                        C: {nutrition.carbs.toFixed(1)}g
                      </Text>
                      <Text style={styles.boxMacro}>
                        F: {nutrition.fat.toFixed(1)}g
                      </Text>
                      <Text style={styles.boxMacro}>
                        Fb: {nutrition.fiber.toFixed(1)}g
                      </Text>
                    </View>

                    {/* Expanded: ingredient list with editable weights */}
                    {isExpanded && (
                      <View style={styles.boxIngredients}>
                        {mp.ingredients.map((ing) => {
                          const isEditing =
                            editingWeight?.boxId === mp.id &&
                            editingWeight?.ingredientId === ing.ingredientId;

                          return (
                            <View key={ing.ingredientId} style={styles.boxIngredientRow}>
                              <Text style={styles.boxIngName}>{ing.name}</Text>
                              {isEditing ? (
                                <TextInput
                                  style={styles.boxIngWeightInput}
                                  value={editingWeight.value}
                                  onChangeText={(text) =>
                                    setEditingWeight({
                                      boxId: mp.id,
                                      ingredientId: ing.ingredientId,
                                      value: text,
                                    })
                                  }
                                  onBlur={() => {
                                    handleAdjustWeight(
                                      mp.id,
                                      ing.ingredientId,
                                      editingWeight.value
                                    );
                                    setEditingWeight(null);
                                  }
                                  }
                                  keyboardType="decimal-pad"
                                  autoFocus
                                  selectTextOnFocus
                                />
                              ) : (
                                <Pressable
                                  onPress={() =>
                                    setEditingWeight({
                                      boxId: mp.id,
                                      ingredientId: ing.ingredientId,
                                      value: ing.weightInGrams.toString(),
                                    })
                                  }>
                                  <Text style={styles.boxIngWeight}>
                                    {ing.weightInGrams}g
                                  </Text>
                                </Pressable>
                              )}
                              <Text style={styles.boxIngCals}>
                                {Math.round(ing.calories)} cal
                              </Text>
                            </View>
                          );
                        })}

                        <Pressable
                          style={styles.deleteBoxButton}
                          onPress={() => handleDeleteBox(mp.id)}>
                          <Text style={styles.deleteBoxButtonText}>
                            Remove Box
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Empty state */}
          {mealpreps.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No mealprep boxes yet</Text>
              <Text style={styles.emptySubtext}>
                Choose how many boxes and tap "Create Boxes" to divide your recipe into portions
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Palette.lightGray2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Palette.darkGray,
  },
  closeButton: {
    fontSize: 24,
    color: Palette.gray,
  },
  saveButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  recipeInfoCard: {
    backgroundColor: Palette.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  recipeDetail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 10,
  },
  boxCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  boxCountButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.lightGray2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  boxCountButtonText: {
    fontSize: 22,
    fontWeight: '600',
    color: Palette.darkGray,
  },
  boxCountInput: {
    flex: 1,
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    paddingVertical: 10,
    fontSize: 20,
    fontWeight: '700',
    color: Palette.darkGray,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  generateButton: {
    backgroundColor: Palette.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: Palette.gray,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.darkGray,
  },
  summaryBarBg: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  summaryBarFill: {
    height: '100%',
    backgroundColor: Palette.primary,
    borderRadius: 3,
  },
  summaryBarOver: {
    backgroundColor: '#e74c3c',
  },
  overWarning: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 6,
    fontWeight: '500',
  },
  boxesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clearAllText: {
    fontSize: 13,
    color: '#e74c3c',
    fontWeight: '600',
  },
  boxCard: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  boxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  boxHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  boxHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boxLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.darkGray,
  },
  boxWeight: {
    fontSize: 13,
    color: Palette.gray,
    fontWeight: '500',
  },
  boxCals: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.primary,
  },
  boxChevron: {
    fontSize: 16,
    color: Palette.gray,
  },
  boxNutritionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  boxMacro: {
    fontSize: 12,
    color: Palette.gray,
    fontWeight: '500',
  },
  boxIngredients: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  boxIngredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ececec',
  },
  boxIngName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Palette.darkGray,
  },
  boxIngWeight: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.primary,
    minWidth: 60,
    textAlign: 'right',
    textDecorationLine: 'underline',
    textDecorationColor: Palette.primary,
  },
  boxIngWeightInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Palette.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
    minWidth: 60,
    textAlign: 'right',
  },
  boxIngCals: {
    fontSize: 12,
    color: Palette.gray,
    marginLeft: 12,
    minWidth: 50,
    textAlign: 'right',
  },
  deleteBoxButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ffebee',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  deleteBoxButtonText: {
    color: '#c62828',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Palette.gray,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
