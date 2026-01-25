import { Palette } from '@/constants/theme';
import { Recipe } from '@/utils/recipes';
import React, { useState } from 'react';
import {
    Keyboard,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

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
  const [recipeName, setRecipeName] = useState(recipe.name);

  const handleSave = () => {
    if (!recipeName.trim()) {
      alert('Please enter a recipe name');
      return;
    }
    const updated = { ...recipe, name: recipeName.trim() };
    onSave(updated);
  };

  const totalNutrition = recipe.ingredients.reduce(
    (sum, ing) => ({
      calories: sum.calories + ing.calories,
      protein: sum.protein + ing.protein,
      carbs: sum.carbs + ing.carbs,
      fat: sum.fat + ing.fat,
      fiber: sum.fiber + ing.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={onCancel}>
              <Text style={styles.cancelButton}>✕</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Build Recipe</Text>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Recipe Name</Text>
            <TextInput
              style={styles.input}
              value={recipeName}
              onChangeText={setRecipeName}
              placeholder="e.g., Meal Prep Chicken Bowl"
              placeholderTextColor={Palette.gray}
            />

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Ingredients ({recipe.ingredients.length})</Text>
                <Pressable style={styles.addIngredientBtn} onPress={onAddIngredientPressed}>
                  <Text style={styles.addIngredientText}>+ Add</Text>
                </Pressable>
              </View>

              {recipe.ingredients.length === 0 ? (
                <Text style={styles.emptyIngredients}>No ingredients yet</Text>
              ) : (
                <View style={styles.ingredientsList}>
                  {recipe.ingredients.map((ingredient) => (
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
                    </View>
                  ))}
                </View>
              )}
            </View>

            {recipe.ingredients.length > 0 && (
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
                </View>
                <Text style={styles.totalWeight}>
                  Total Weight: {recipe.totalWeightInGrams}g
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
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
  input: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Palette.darkGray,
    marginBottom: 24,
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
