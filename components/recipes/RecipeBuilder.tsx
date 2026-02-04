import { Palette } from '@/constants/theme';
import { Recipe, RecipeIngredient, removeIngredientFromRecipe } from '@/utils/recipes';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal, Platform, Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RecipeBuilderProps {
  visible: boolean;
  recipe: Recipe;
  onSave: (recipe: Recipe) => void;
  onRecipeChange?: (recipe: Recipe) => void;
  onCancel: () => void;
  onAddIngredientPressed: () => void;
}

export const RecipeBuilder = React.memo(function RecipeBuilder({
  visible,
  recipe,
  onSave,
  onRecipeChange,
  onCancel,
  onAddIngredientPressed,
}: RecipeBuilderProps) {
  const insets = useSafeAreaInsets();
  const [recipeName, setRecipeName] = useState(recipe.name);
  const [currentRecipe, setCurrentRecipe] = useState(recipe);
  const [originalIngredients, setOriginalIngredients] = useState<RecipeIngredient[]>(recipe.ingredients);
  const [editingIngredient, setEditingIngredient] = useState<RecipeIngredient | null>(null);
  const [editingWeight, setEditingWeight] = useState('100');
  const [activeScale, setActiveScale] = useState<number | null>(null);
  const isWeb = Platform.OS === 'web';

  // Only update baseline when modal opens, preserve it during editing
  useEffect(() => {
    if (visible) {
      setRecipeName(recipe.name);
      setCurrentRecipe(recipe);
      setOriginalIngredients(recipe.ingredients.map(ing => ({ ...ing })));
      setActiveScale(null);
    }
  }, [visible]);

  // Update when recipe prop changes while modal is open (e.g., when ingredients are added)
  useEffect(() => {
    if (visible && recipe.ingredients.length !== currentRecipe.ingredients.length) {
      setCurrentRecipe(recipe);
      setOriginalIngredients(recipe.ingredients.map(ing => ({ ...ing })));
    }
  }, [recipe, visible, currentRecipe.ingredients.length]);

  const handleDeleteIngredient = (ingredientId: string) => {
    Alert.alert(
      'Remove Ingredient',
      'Are you sure you want to remove this ingredient?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Remove',
          onPress: () => {
            if (!isWeb) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            const updated = removeIngredientFromRecipe(currentRecipe, ingredientId);
            setCurrentRecipe(updated);
            setOriginalIngredients(updated.ingredients.map(ing => ({ ...ing })));
            setActiveScale(null);
            // Notify parent of change
            if (onRecipeChange) {
              onRecipeChange(updated);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleSave = () => {
    if (!recipeName.trim()) {
      alert('Please enter a recipe name');
      return;
    }
    
    if (recipeName.trim().length > 50) {
      alert('Recipe name is too long (max 50 characters)');
      return;
    }
    
    if (currentRecipe.ingredients.length === 0) {
      alert('Please add at least one ingredient to the recipe');
      return;
    }

    if (!isWeb) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const updated = { ...currentRecipe, name: recipeName.trim() };
    onSave(updated);
  };

  const handleCancel = () => {
    // Reset all state to match current recipe
    setRecipeName(recipe.name);
    setCurrentRecipe(recipe);
    onCancel();
  };

  const handleEditIngredient = (ingredient: RecipeIngredient) => {
    setEditingIngredient(ingredient);
    setEditingWeight(ingredient.weightInGrams.toString());
  };

  const handleSaveEditIngredient = () => {
    if (!editingIngredient) return;
    const newWeight = parseFloat(editingWeight) || editingIngredient.weightInGrams;
    
    if (isNaN(newWeight) || newWeight <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight greater than 0');
      return;
    }
    
    if (newWeight > 10000) {
      Alert.alert('Weight Too High', 'Maximum weight per ingredient is 10kg (10000g)');
      return;
    }

    const weightRatio = newWeight / editingIngredient.weightInGrams;
    const updatedIngredient: RecipeIngredient = {
      ...editingIngredient,
      weightInGrams: parseFloat(newWeight.toFixed(2)),
      calories: parseFloat((editingIngredient.calories * weightRatio).toFixed(2)),
      protein: parseFloat((editingIngredient.protein * weightRatio).toFixed(2)),
      carbs: parseFloat((editingIngredient.carbs * weightRatio).toFixed(2)),
      fat: parseFloat((editingIngredient.fat * weightRatio).toFixed(2)),
      fiber: parseFloat((editingIngredient.fiber * weightRatio).toFixed(2)),
    };

    const updatedIngredients = currentRecipe.ingredients.map((ing) =>
      ing.id === editingIngredient.id ? updatedIngredient : ing
    );

    const totalWeight = updatedIngredients.reduce((sum, ing) => sum + ing.weightInGrams, 0);
    const updated = {
      ...currentRecipe,
      ingredients: updatedIngredients,
      totalWeightInGrams: totalWeight,
    };

    setCurrentRecipe(updated);
    setOriginalIngredients(updatedIngredients.map(ing => ({ ...ing })));
    setActiveScale(null);
    setEditingIngredient(null);

    if (!isWeb) {
      Haptics.selectionAsync();
    }
  };

  const handleScaleRecipe = (multiplier: number) => {
    if (!isWeb) {
      Haptics.selectionAsync();
    }
    
    const scaledIngredients = currentRecipe.ingredients.map((ing) => ({
      ...ing,
      weightInGrams: ing.weightInGrams * multiplier,
      calories: ing.calories * multiplier,
      protein: ing.protein * multiplier,
      carbs: ing.carbs * multiplier,
      fat: ing.fat * multiplier,
      fiber: ing.fiber * multiplier,
    }));

    const totalWeight = scaledIngredients.reduce((sum, ing) => sum + ing.weightInGrams, 0);
    const updated = {
      ...currentRecipe,
      ingredients: scaledIngredients,
      totalWeightInGrams: totalWeight,
    };

    setCurrentRecipe(updated);
    setActiveScale(multiplier);
  };

  const handleResetScale = () => {
    if (!isWeb) {
      Haptics.selectionAsync();
    }
    const totalWeight = originalIngredients.reduce((sum, ing) => sum + ing.weightInGrams, 0);
    const resetRecipe = {
      ...currentRecipe,
      ingredients: originalIngredients.map(ing => ({ ...ing })),
      totalWeightInGrams: totalWeight,
    };
    setCurrentRecipe(resetRecipe);
    setActiveScale(null);
  };

  const originalIngredientsById = useMemo(() => {
    const map = new Map<string, RecipeIngredient>();
    originalIngredients.forEach((ing) => map.set(ing.id, ing));
    return map;
  }, [originalIngredients]);

  const isScaled =
    currentRecipe.ingredients.length !== originalIngredients.length ||
    currentRecipe.ingredients.some((ing) => {
      const original = originalIngredientsById.get(ing.id);
      if (!original) return true;
      return (
        ing.weightInGrams !== original.weightInGrams ||
        ing.calories !== original.calories ||
        ing.protein !== original.protein ||
        ing.carbs !== original.carbs ||
        ing.fat !== original.fat ||
        ing.fiber !== original.fiber
      );
    });

  const totalNutrition = currentRecipe.ingredients.reduce(
    (sum, ing) => ({
      calories: sum.calories + ing.calories,
      protein: sum.protein + ing.protein,
      carbs: sum.carbs + ing.carbs,
      fat: sum.fat + ing.fat,
      fiber: sum.fiber + ing.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  // Sort ingredients by name for better UX
  const sortedIngredients = [...currentRecipe.ingredients].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const nutritionPer100g = {
    calories: totalNutrition.calories / (currentRecipe.totalWeightInGrams || 1) * 100,
    protein: totalNutrition.protein / (currentRecipe.totalWeightInGrams || 1) * 100,
    carbs: totalNutrition.carbs / (currentRecipe.totalWeightInGrams || 1) * 100,
    fat: totalNutrition.fat / (currentRecipe.totalWeightInGrams || 1) * 100,
    fiber: totalNutrition.fiber / (currentRecipe.totalWeightInGrams || 1) * 100,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={handleCancel} hitSlop={10} accessibilityLabel="Close recipe builder">
            <Text style={styles.cancelButton}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Build Recipe</Text>
          <Pressable style={styles.saveButton} onPress={handleSave} hitSlop={10} accessibilityLabel="Save recipe">
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
          <View style={styles.labelRow}>
            <Text style={styles.label}>Recipe Name</Text>
            <Text style={styles.charCount}>{recipeName.length}/50</Text>
          </View>
          <TextInput
            style={styles.input}
            value={recipeName}
            onChangeText={(text) => {
              if (text.length <= 50) {
                setRecipeName(text);
              }
            }}
            placeholder="e.g., Meal Prep Chicken Bowl"
            placeholderTextColor="#b3b3b3"
            autoCapitalize="words"
            maxLength={50}
          />

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Ingredients ({currentRecipe.ingredients.length})</Text>
                <Pressable
                  style={styles.addIngredientBtn}
                  onPress={() => {
                    Keyboard.dismiss();
                    onAddIngredientPressed();
                  }}
                  hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
                  accessibilityLabel="Add ingredient to recipe">
                  <Text style={styles.addIngredientText}>+ Add</Text>
                </Pressable>
              </View>

              {currentRecipe.ingredients.length === 0 ? (
                <Text style={styles.emptyIngredients}>No ingredients yet</Text>
              ) : (
                <View style={styles.ingredientsList}>
                  {sortedIngredients.map((ingredient) => (
                    <Pressable
                      key={ingredient.id}
                      style={styles.ingredientItem}
                      onPress={() => handleEditIngredient(ingredient)}>
                      <View style={styles.ingredientInfo}>
                        <Text style={styles.ingredientName}>{ingredient.name}</Text>
                        <Text style={styles.ingredientWeight}>{ingredient.weightInGrams}g</Text>
                      </View>
                      <View style={styles.ingredientNutrition}>
                        <Text style={styles.ingredientCalories}>
                          {Math.round(ingredient.calories)} kcal
                        </Text>
                      </View>
                      <Pressable
                        style={styles.deleteIngredientBtn}
                        onPress={() => handleDeleteIngredient(ingredient.id)}
                        hitSlop={8}
                        accessibilityLabel={`Delete ${ingredient.name}`}>
                        <Text style={styles.deleteIngredientText}>✕</Text>
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {currentRecipe.ingredients.length > 0 && (
              <View style={styles.nutritionSummary}>
                <View style={styles.scaleSection}>
                  <Text style={styles.summaryTitle}>Scale Recipe</Text>
                  <View style={styles.scaleButtonsRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.scaleButtonReset,
                        !isScaled && styles.scaleButtonDisabled,
                        pressed && isScaled && styles.scaleButtonPressed,
                      ]}
                      onPress={handleResetScale}
                      disabled={!isScaled}>
                      <Text style={styles.scaleButtonText}>Reset</Text>
                    </Pressable>
                    {[0.5, 1.5, 2, 3].map((multiplier) => (
                      <Pressable
                        key={multiplier}
                        style={({ pressed }) => [
                          styles.scaleButton,
                          activeScale === multiplier && styles.scaleButtonActive,
                          pressed && styles.scaleButtonPressed,
                        ]}
                        onPress={() => handleScaleRecipe(multiplier)}>
                        <Text style={styles.scaleButtonText}>×{multiplier}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.totalNutritionBox}>
                  <Text style={styles.summaryTitle}>Per 100g</Text>
                  <View style={styles.nutritionGrid}>
                    <View style={styles.nutriItem}>
                      <Text style={styles.nutriLabel}>Calories</Text>
                      <Text style={styles.nutriValue}>{Math.round(nutritionPer100g.calories)}</Text>
                    </View>
                    <View style={styles.nutriItem}>
                      <Text style={styles.nutriLabel}>Protein</Text>
                      <Text style={styles.nutriValue}>{nutritionPer100g.protein.toFixed(1)}g</Text>
                    </View>
                    <View style={styles.nutriItem}>
                      <Text style={styles.nutriLabel}>Carbs</Text>
                      <Text style={styles.nutriValue}>{nutritionPer100g.carbs.toFixed(1)}g</Text>
                    </View>
                    <View style={styles.nutriItem}>
                      <Text style={styles.nutriLabel}>Fat</Text>
                      <Text style={styles.nutriValue}>{nutritionPer100g.fat.toFixed(1)}g</Text>
                    </View>
                    <View style={styles.nutriItem}>
                      <Text style={styles.nutriLabel}>Fiber</Text>
                      <Text style={styles.nutriValue}>{nutritionPer100g.fiber.toFixed(1)}g</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.per100gSection}>
                  <Text style={styles.per100gTitle}>Total Nutrition</Text>
                  <View style={styles.per100gGrid}>
                    <View style={styles.per100gItem}>
                      <Text style={styles.per100gLabel}>Total</Text>
                      <Text style={styles.per100gValue}>{Math.round(totalNutrition.calories)} kcal</Text>
                    </View>
                    <View style={styles.per100gItem}>
                      <Text style={styles.per100gLabel}>Protein</Text>
                      <Text style={styles.per100gValue}>{Math.round(totalNutrition.protein)}g</Text>
                    </View>
                    <View style={styles.per100gItem}>
                      <Text style={styles.per100gLabel}>Carbs</Text>
                      <Text style={styles.per100gValue}>{Math.round(totalNutrition.carbs)}g</Text>
                    </View>
                    <View style={styles.per100gItem}>
                      <Text style={styles.per100gLabel}>Fat</Text>
                      <Text style={styles.per100gValue}>{Math.round(totalNutrition.fat)}g</Text>
                    </View>
                    <View style={styles.per100gItem}>
                      <Text style={styles.per100gLabel}>Fiber</Text>
                      <Text style={styles.per100gValue}>{Math.round(totalNutrition.fiber)}g</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.totalWeight}>
                  Total Weight: {currentRecipe.totalWeightInGrams}g
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Edit Ingredient Modal */}
        <Modal visible={!!editingIngredient} animationType="slide" transparent={false}>
          <View style={[styles.editModal, { paddingTop: insets.top }]}>
            <View style={styles.editModalHeader}>
              <Pressable onPress={() => setEditingIngredient(null)} hitSlop={10}>
                <Text style={styles.editModalCancel}>✕</Text>
              </Pressable>
              <Text style={styles.editModalTitle}>Edit {editingIngredient?.name}</Text>
              <Pressable
                style={styles.editModalSave}
                onPress={handleSaveEditIngredient}
                hitSlop={10}>
                <Text style={styles.editModalSaveText}>Save</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.editModalContent} keyboardShouldPersistTaps="always">
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Weight (grams)</Text>
                <TextInput
                  style={styles.editInput}
                  value={editingWeight}
                  onChangeText={setEditingWeight}
                  keyboardType="decimal-pad"
                  placeholder="100"
                  placeholderTextColor="#b3b3b3"
                  autoFocus
                />

                {editingIngredient && (
                  <View style={styles.editPreview}>
                    <Text style={styles.editPreviewTitle}>Nutrition at this weight:</Text>
                    <View style={styles.editPreviewGrid}>
                      {(() => {
                        const ratio = (parseFloat(editingWeight) || editingIngredient.weightInGrams) / editingIngredient.weightInGrams;
                        return (
                          <>
                            <View style={styles.editPreviewItem}>
                              <Text style={styles.editPreviewLabel}>Calories</Text>
                              <Text style={styles.editPreviewValue}>{Math.round(editingIngredient.calories * ratio)}</Text>
                            </View>
                            <View style={styles.editPreviewItem}>
                              <Text style={styles.editPreviewLabel}>Protein</Text>
                              <Text style={styles.editPreviewValue}>{(editingIngredient.protein * ratio).toFixed(1)}g</Text>
                            </View>
                            <View style={styles.editPreviewItem}>
                              <Text style={styles.editPreviewLabel}>Carbs</Text>
                              <Text style={styles.editPreviewValue}>{(editingIngredient.carbs * ratio).toFixed(1)}g</Text>
                            </View>
                            <View style={styles.editPreviewItem}>
                              <Text style={styles.editPreviewLabel}>Fat</Text>
                              <Text style={styles.editPreviewValue}>{(editingIngredient.fat * ratio).toFixed(1)}g</Text>
                            </View>
                          </>
                        );
                      })()}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </Modal>
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
  cancelButton: {
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: Palette.gray,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Palette.darkGray,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.darkGray,
  },
  addIngredientBtn: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIngredientText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyIngredients: {
    fontSize: 14,
    color: Palette.gray,
    textAlign: 'center',
    paddingVertical: 24,
  },
  ingredientsList: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '500',
    color: Palette.darkGray,
    marginBottom: 4,
  },
  ingredientWeight: {
    fontSize: 12,
    color: Palette.gray,
  },
  ingredientNutrition: {
    paddingLeft: 12,
  },
  ingredientCalories: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.primary,
  },
  deleteIngredientBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffebee',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  deleteIngredientText: {
    color: '#c62828',
    fontSize: 16,
    fontWeight: '600',
  },
  nutritionSummary: {
    backgroundColor: Palette.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nutriItem: {
    flex: 1,
    alignItems: 'center',
  },
  nutriLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  nutriValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  totalWeight: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 8,
  },
  scaleSection: {
    marginBottom: 20,
  },
  totalNutritionBox: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  scaleButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  scaleButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  scaleButtonReset: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  scaleButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderColor: 'rgba(255,255,255,0.7)',
  },
  scaleButtonPressed: {
    opacity: 0.7,
  },
  scaleButtonDisabled: {
    opacity: 0.4,
  },
  scaleButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  per100gSection: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  per100gTitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginBottom: 8,
  },
  per100gGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  per100gItem: {
    flex: 1,
    alignItems: 'center',
  },
  per100gLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  per100gValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  editModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.lightGray2,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Palette.darkGray,
    flex: 1,
    textAlign: 'center',
  },
  editModalCancel: {
    fontSize: 24,
    color: Palette.gray,
  },
  editModalSave: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editModalSaveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editModalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  editSection: {
    marginBottom: 24,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Palette.darkGray,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  editPreview: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    padding: 12,
  },
  editPreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 12,
  },
  editPreviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  editPreviewItem: {
    alignItems: 'center',
  },
  editPreviewLabel: {
    fontSize: 11,
    color: Palette.gray,
    marginBottom: 4,
  },
  editPreviewValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.darkGray,
  },
});
