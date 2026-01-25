import { Palette } from '@/constants/theme';
import { portionRecipe, Recipe } from '@/utils/recipes';
import React, { useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RecipeLoggerProps {
  visible: boolean;
  recipe: Recipe;
  onLog: (logData: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }) => void;
  onCancel: () => void;
}

export const RecipeLogger = React.memo(function RecipeLogger({
  visible,
  recipe,
  onLog,
  onCancel,
}: RecipeLoggerProps) {
  const insets = useSafeAreaInsets();
  const [portionSize, setPortionSize] = useState(
    Math.round(recipe.totalWeightInGrams / 2).toString()
  );

  const handleLog = () => {
    const portion = parseFloat(portionSize);
    if (isNaN(portion) || portion <= 0) {
      alert('Please enter a valid portion size');
      return;
    }

    const totalNutrition = portionRecipe(recipe, portion);

    onLog({
      name: `${recipe.name} (${portion}g)`,
      calories: Math.round(totalNutrition.calories),
      protein: Math.round(totalNutrition.protein * 10) / 10,
      carbs: Math.round(totalNutrition.carbs * 10) / 10,
      fat: Math.round(totalNutrition.fat * 10) / 10,
      fiber: Math.round(totalNutrition.fiber * 10) / 10,
    });
  };

  const portioned = portionRecipe(recipe, parseFloat(portionSize) || 100); // Default to 100g if empty
  const totalNutrition = portioned;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} hitSlop={10}>
            <Text style={styles.cancelButton}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Log Recipe</Text>
          <Pressable style={styles.logButton} onPress={handleLog} hitSlop={10}>
            <Text style={styles.logButtonText}>Add</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.recipeName}>{recipe.name}</Text>
            <Text style={styles.recipeNote}>
              Total: {recipe.totalWeightInGrams}g
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Portion Size (grams)</Text>
            <View style={styles.portionInputContainer}>
              <TextInput
                style={styles.portionInput}
                value={portionSize}
                onChangeText={setPortionSize}
                placeholder="e.g., 500"
                keyboardType="decimal-pad"
                placeholderTextColor={Palette.gray}
              />
              <Text style={styles.portionMax}>
                of {recipe.totalWeightInGrams}g
              </Text>
            </View>
          </View>

          <View style={styles.nutritionSection}>
            <Text style={styles.sectionTitle}>Scaled Nutrition</Text>
            <View style={styles.nutritionGrid}>
              <View style={styles.nutriItem}>
                <Text style={styles.nutriLabel}>Calories</Text>
                <Text style={styles.nutriValue}>
                  {Math.round(totalNutrition.calories)}
                </Text>
              </View>
              <View style={styles.nutriItem}>
                <Text style={styles.nutriLabel}>Protein</Text>
                <Text style={styles.nutriValue}>
                  {Math.round(totalNutrition.protein)}g
                </Text>
              </View>
              <View style={styles.nutriItem}>
                <Text style={styles.nutriLabel}>Carbs</Text>
                <Text style={styles.nutriValue}>
                  {Math.round(totalNutrition.carbs)}g
                </Text>
              </View>
              <View style={styles.nutriItem}>
                <Text style={styles.nutriLabel}>Fat</Text>
                <Text style={styles.nutriValue}>
                  {Math.round(totalNutrition.fat)}g
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients ({recipe.ingredients.length})</Text>
            {recipe.ingredients.map((ing) => (
              <View key={ing.id} style={styles.ingredientItem}>
                <View style={styles.ingredientDetails}>
                  <Text style={styles.ingredientName}>{ing.name}</Text>
                  <Text style={styles.ingredientWeight}>{ing.weightInGrams}g</Text>
                </View>
                <Text style={styles.ingredientCals}>
                  {Math.round(ing.calories)} kcal
                </Text>
              </View>
            ))}
          </View>
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
  logButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.darkGray,
    marginBottom: 4,
  },
  recipeNote: {
    fontSize: 12,
    color: Palette.gray,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 8,
  },
  portionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  portionInput: {
    flex: 1,
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Palette.darkGray,
  },
  portionMax: {
    fontSize: 12,
    color: Palette.gray,
  },
  nutritionSection: {
    backgroundColor: Palette.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.lightGray2,
  },
  ingredientDetails: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '500',
    color: Palette.darkGray,
  },
  ingredientWeight: {
    fontSize: 12,
    color: Palette.gray,
    marginTop: 2,
  },
  ingredientCals: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.darkGray,
  },
});
