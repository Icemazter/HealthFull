import { Palette } from '@/constants/theme';
import { calculateMealPrepNutrition, portionRecipe, Recipe } from '@/utils/recipes';
import React, { useMemo, useState } from 'react';
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
    mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
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
  const hasMealpreps = (recipe.mealpreps?.length ?? 0) > 0;

  // Logging mode: 'box' if mealpreps exist, 'portion' otherwise
  const [mode, setMode] = useState<'box' | 'portion'>(hasMealpreps ? 'box' : 'portion');
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [portionSize, setPortionSize] = useState(
    Math.round(recipe.totalWeightInGrams / 2).toString()
  );
  const [servings, setServings] = useState('1');
  const [mealType, setMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>('Lunch');

  const selectedBox = useMemo(
    () => recipe.mealpreps?.find((mp) => mp.id === selectedBoxId) ?? null,
    [recipe.mealpreps, selectedBoxId]
  );

  const boxNutrition = useMemo(
    () => (selectedBox ? calculateMealPrepNutrition(selectedBox) : null),
    [selectedBox]
  );

  // Portion-mode nutrition (existing logic)
  const defaultPortion = Math.round(recipe.totalWeightInGrams / 2);
  const parsedPortion = parseFloat(portionSize);
  const actualPortion = isNaN(parsedPortion) || parsedPortion <= 0 ? defaultPortion : parsedPortion;
  const portioned = portionRecipe(recipe, actualPortion);
  const numServings = parseFloat(servings) || 1;
  const portionNutrition = {
    calories: portioned.calories * numServings,
    protein: portioned.protein * numServings,
    carbs: portioned.carbs * numServings,
    fat: portioned.fat * numServings,
    fiber: portioned.fiber * numServings,
  };

  // The active nutrition to display
  const displayNutrition = mode === 'box' && boxNutrition
    ? boxNutrition
    : portionNutrition;

  const handleLog = () => {
    if (mode === 'box') {
      if (!selectedBox || !boxNutrition) {
        alert('Please select a mealprep box');
        return;
      }

      onLog({
        name: `${recipe.name} (${selectedBox.label})`,
        calories: Math.round(boxNutrition.calories),
        protein: Math.round(boxNutrition.protein * 10) / 10,
        carbs: Math.round(boxNutrition.carbs * 10) / 10,
        fat: Math.round(boxNutrition.fat * 10) / 10,
        fiber: Math.round(boxNutrition.fiber * 10) / 10,
        mealType: mealType,
      });
    } else {
      const portion = parseFloat(portionSize);
      const srvs = parseFloat(servings) || 1;
      
      if (isNaN(portion) || portion <= 0) {
        alert('Please enter a valid portion size (greater than 0g)');
        return;
      }
      
      if (portion > recipe.totalWeightInGrams) {
        alert(`Portion size cannot exceed total recipe weight (${recipe.totalWeightInGrams}g)`);
        return;
      }
      
      if (isNaN(srvs) || srvs <= 0) {
        alert('Please enter a valid number of servings (greater than 0)');
        return;
      }

      const totalNutrition = portionRecipe(recipe, portion);
      const multiplied = {
        calories: totalNutrition.calories * srvs,
        protein: totalNutrition.protein * srvs,
        carbs: totalNutrition.carbs * srvs,
        fat: totalNutrition.fat * srvs,
        fiber: totalNutrition.fiber * srvs,
      };

      onLog({
        name: `${recipe.name} (${Math.round(portion)}g${srvs > 1 ? ` × ${srvs}` : ''})`,
        calories: Math.round(multiplied.calories),
        protein: Math.round(multiplied.protein * 10) / 10,
        carbs: Math.round(multiplied.carbs * 10) / 10,
        fat: Math.round(multiplied.fat * 10) / 10,
        fiber: Math.round(multiplied.fiber * 10) / 10,
        mealType: mealType,
      });
    }
  };

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
              {hasMealpreps ? ` · ${recipe.mealpreps!.length} boxes` : ''}
            </Text>
          </View>

          {/* Mode toggle: only show if recipe has mealpreps */}
          {hasMealpreps && (
            <View style={styles.section}>
              <View style={styles.modeToggleRow}>
                <Pressable
                  style={[styles.modeButton, mode === 'box' && styles.modeButtonActive]}
                  onPress={() => setMode('box')}>
                  <Text style={[styles.modeButtonText, mode === 'box' && styles.modeButtonTextActive]}>
                    Mealprep Box
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.modeButton, mode === 'portion' && styles.modeButtonActive]}
                  onPress={() => setMode('portion')}>
                  <Text style={[styles.modeButtonText, mode === 'portion' && styles.modeButtonTextActive]}>
                    Custom Portion
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Box selection mode */}
          {mode === 'box' && hasMealpreps && (
            <View style={styles.section}>
              <Text style={styles.label}>Select a Box</Text>
              {recipe.mealpreps!.map((mp) => {
                const mpNutrition = calculateMealPrepNutrition(mp);
                const isSelected = selectedBoxId === mp.id;

                return (
                  <Pressable
                    key={mp.id}
                    style={[styles.boxOption, isSelected && styles.boxOptionSelected]}
                    onPress={() => setSelectedBoxId(mp.id)}>
                    <View style={styles.boxOptionLeft}>
                      <View style={[styles.boxRadio, isSelected && styles.boxRadioSelected]}>
                        {isSelected && <View style={styles.boxRadioDot} />}
                      </View>
                      <View>
                        <Text style={[styles.boxOptionLabel, isSelected && styles.boxOptionLabelSelected]}>
                          {mp.label}
                        </Text>
                        <Text style={styles.boxOptionWeight}>
                          {Math.round(mp.totalWeightInGrams)}g
                        </Text>
                      </View>
                    </View>
                    <View style={styles.boxOptionRight}>
                      <Text style={[styles.boxOptionCals, isSelected && styles.boxOptionCalsSelected]}>
                        {Math.round(mpNutrition.calories)} kcal
                      </Text>
                      <Text style={styles.boxOptionMacros}>
                        P:{mpNutrition.protein.toFixed(0)}g C:{mpNutrition.carbs.toFixed(0)}g F:{mpNutrition.fat.toFixed(0)}g
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Portion mode (existing) */}
          {mode === 'portion' && (
            <>
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

              <View style={styles.section}>
                <Text style={styles.label}>Number of Servings</Text>
                <View style={styles.portionInputContainer}>
                  <TextInput
                    style={styles.portionInput}
                    value={servings}
                    onChangeText={setServings}
                    placeholder="1"
                    keyboardType="decimal-pad"
                    placeholderTextColor={Palette.gray}
                  />
                  <Text style={styles.portionMax}>
                    × this portion
                  </Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>Meal Type</Text>
            <View style={styles.mealTypeRow}>
              {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((meal) => (
                <Pressable
                  key={meal}
                  style={[styles.mealTypeButton, mealType === meal && styles.mealTypeButtonActive]}
                  onPress={() => setMealType(meal)}
                  hitSlop={8}
                >
                  <Text style={[styles.mealTypeButtonText, mealType === meal && styles.mealTypeButtonTextActive]}>
                    {meal}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.nutritionSection}>
            <Text style={styles.sectionTitle}>
              {mode === 'box' && selectedBox
                ? `${selectedBox.label} Nutrition`
                : 'Scaled Nutrition'}
            </Text>
            <View style={styles.nutritionGrid}>
              <View style={styles.nutriItem}>
                <Text style={styles.nutriLabel}>Calories</Text>
                <Text style={styles.nutriValue}>
                  {Math.round(displayNutrition.calories)}
                </Text>
              </View>
              <View style={styles.nutriItem}>
                <Text style={styles.nutriLabel}>Protein</Text>
                <Text style={styles.nutriValue}>
                  {Math.round(displayNutrition.protein * 10) / 10}g
                </Text>
              </View>
              <View style={styles.nutriItem}>
                <Text style={styles.nutriLabel}>Carbs</Text>
                <Text style={styles.nutriValue}>
                  {Math.round(displayNutrition.carbs * 10) / 10}g
                </Text>
              </View>
              <View style={styles.nutriItem}>
                <Text style={styles.nutriLabel}>Fat</Text>
                <Text style={styles.nutriValue}>
                  {Math.round(displayNutrition.fat * 10) / 10}g
                </Text>
              </View>
              <View style={styles.nutriItem}>
                <Text style={styles.nutriLabel}>Fiber</Text>
                <Text style={styles.nutriValue}>
                  {Math.round(displayNutrition.fiber * 10) / 10}g
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle2}>
              {mode === 'box' && selectedBox
                ? `${selectedBox.label} Ingredients (${selectedBox.ingredients.length})`
                : `Ingredients (${recipe.ingredients.length})`}
            </Text>
            {mode === 'box' && selectedBox ? (
              selectedBox.ingredients.map((ing) => (
                <View key={ing.ingredientId} style={styles.ingredientItem}>
                  <View style={styles.ingredientDetails}>
                    <Text style={styles.ingredientName}>{ing.name}</Text>
                    <Text style={styles.ingredientWeight}>{ing.weightInGrams}g</Text>
                  </View>
                  <Text style={styles.ingredientCals}>
                    {Math.round(ing.calories)} kcal
                  </Text>
                </View>
              ))
            ) : (
              recipe.ingredients.map((ing) => (
                <View key={ing.id} style={styles.ingredientItem}>
                  <View style={styles.ingredientDetails}>
                    <Text style={styles.ingredientName}>{ing.name}</Text>
                    <Text style={styles.ingredientWeight}>{ing.weightInGrams}g</Text>
                  </View>
                  <Text style={styles.ingredientCals}>
                    {Math.round(ing.calories)} kcal
                  </Text>
                </View>
              ))
            )}
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
    gap: 12,
    paddingHorizontal: 4,
    flexWrap: 'nowrap',
  },
  portionInput: {
    flex: 1,
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Palette.darkGray,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  portionMax: {
    fontSize: 12,
    color: Palette.gray,
    minWidth: 56,
    textAlign: 'right',
    marginLeft: 8,
    flexShrink: 0,
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
  sectionTitle2: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
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
    fontSize: 14,
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
  mealTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  mealTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    alignItems: 'center',
  },
  mealTypeButtonActive: {
    backgroundColor: Palette.primary,
  },
  mealTypeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.darkGray,
  },
  mealTypeButtonTextActive: {
    color: '#fff',
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: '#f0f7ff',
    borderColor: Palette.primary,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.gray,
  },
  modeButtonTextActive: {
    color: Palette.primary,
  },
  boxOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.lightGray2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  boxOptionSelected: {
    borderColor: Palette.primary,
    backgroundColor: '#f0f7ff',
  },
  boxOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  boxRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Palette.gray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxRadioSelected: {
    borderColor: Palette.primary,
  },
  boxRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Palette.primary,
  },
  boxOptionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.darkGray,
  },
  boxOptionLabelSelected: {
    color: Palette.primary,
  },
  boxOptionWeight: {
    fontSize: 12,
    color: Palette.gray,
    marginTop: 2,
  },
  boxOptionRight: {
    alignItems: 'flex-end',
  },
  boxOptionCals: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
  },
  boxOptionCalsSelected: {
    color: Palette.primary,
  },
  boxOptionMacros: {
    fontSize: 11,
    color: Palette.gray,
    marginTop: 2,
  },
});
