import { Palette } from '@/constants/theme';
import { Recipe, removeIngredientFromRecipe } from '@/utils/recipes';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
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
  onCancel: () => void;
  onAddIngredientPressed: () => void;
}

export const RecipeBuilder = React.memo(function RecipeBuilder({
  visible,
  recipe,
  onSave,
  onCancel,
  onAddIngredientPressed,
}: RecipeBuilderProps) {
  const insets = useSafeAreaInsets();
  const [recipeName, setRecipeName] = useState(recipe.name);
  const [currentRecipe, setCurrentRecipe] = useState(recipe);

  // Sync recipe name when recipe prop changes or modal opens/closes
  useEffect(() => {
    setRecipeName(recipe.name);
    setCurrentRecipe(recipe);
  }, [recipe, visible]);

  const handleDeleteIngredient = (ingredientId: string) => {
    Alert.alert(
      'Remove Ingredient',
      'Are you sure you want to remove this ingredient?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Remove',
          onPress: () => {
            const updated = removeIngredientFromRecipe(currentRecipe, ingredientId);
            setCurrentRecipe(updated);
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
    const updated = { ...currentRecipe, name: recipeName.trim() };
    onSave(updated);
  };

  const handleCancel = () => {
    // Reset all state to match current recipe
    setRecipeName(recipe.name);
    setCurrentRecipe(recipe);
    onCancel();
  };

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

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                <Pressable style={styles.addIngredientBtn} onPress={onAddIngredientPressed} hitSlop={8} accessibilityLabel="Add ingredient to recipe">
                  <Text style={styles.addIngredientText}>+ Add</Text>
                </Pressable>
              </View>

              {currentRecipe.ingredients.length === 0 ? (
                <Text style={styles.emptyIngredients}>No ingredients yet</Text>
              ) : (
                <View style={styles.ingredientsList}>
                  {sortedIngredients.map((ingredient) => (
                    <View key={ingredient.id} style={styles.ingredientItem}>
                      <View style={styles.ingredientInfo}>
                        <Text style={styles.ingredientName}>{ingredient.name}</Text>
                        <Text style={styles.ingredientWeight}>{ingredient.weightInGrams}g</Text>
                      </View>
                      <View style={styles.ingredientNutrition}>
                        <Text style={styles.nutriValue}>
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
                    </View>
                  ))}
                </View>
              )}
            </View>

            {currentRecipe.ingredients.length > 0 && (
              <View style={styles.nutritionSummary}>
                <Text style={styles.summaryTitle}>Total Nutrition</Text>
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutriItem}>
                    <Text style={styles.nutriLabel}>Total</Text>
                    <Text style={styles.nutriValue}>{Math.round(totalNutrition.calories)} kcal</Text>
                  </View>
                  <View style={styles.nutriItem}>
                    <Text style={styles.nutriLabel}>Protein</Text>
                    <Text style={styles.nutriValue}>{Math.round(totalNutrition.protein)}g</Text>
                  </View>
                  <View style={styles.nutriItem}>
                    <Text style={styles.nutriLabel}>Carbs</Text>
                    <Text style={styles.nutriValue}>{Math.round(totalNutrition.carbs)}g</Text>
                  </View>
                  <View style={styles.nutriItem}>
                    <Text style={styles.nutriLabel}>Fat</Text>
                    <Text style={styles.nutriValue}>{Math.round(totalNutrition.fat)}g</Text>
                  </View>
                  <View style={styles.nutriItem}>
                    <Text style={styles.nutriLabel}>Fiber</Text>
                    <Text style={styles.nutriValue}>{Math.round(totalNutrition.fiber)}g</Text>
                  </View>
                </View>
                <Text style={styles.totalWeight}>
                  Total Weight: {currentRecipe.totalWeightInGrams}g
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
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
  },
});
