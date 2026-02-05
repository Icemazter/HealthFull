import { BASIC_INGREDIENTS } from '@/constants/basic-ingredients';
import { Palette } from '@/constants/theme';
import { RecipeIngredient } from '@/utils/recipes';
import { STORAGE_KEYS, storage } from '@/utils/storage';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    Keyboard,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Utility for generating unique IDs
const generateUniqueId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

interface IngredientSelectorProps {
  visible: boolean;
  onSelect: (ingredient: RecipeIngredient) => void;
  onCancel: () => void;
  onScanPressed: () => void;
}

interface SavedFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  weight?: number; // Original weight in grams
}

export const IngredientSelector = React.memo(function IngredientSelector({
  visible,
  onSelect,
  onCancel,
  onScanPressed,
}: IngredientSelectorProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'saved' | 'basics'>('scan');
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [manualFiber, setManualFiber] = useState('');
  const [manualWeight, setManualWeight] = useState('100');
  const [savedFoods, setSavedFoods] = useState<SavedFood[]>([]);
  const [selectedAmount, setSelectedAmount] = useState('100');
  const [useExactAmount, setUseExactAmount] = useState(false);
  const [selectedFood, setSelectedFood] = useState<SavedFood | null>(null);
  const [loadingSavedFoods, setLoadingSavedFoods] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    if (visible) {
      checkForScannedIngredient();
      if (activeTab === 'saved') {
        loadSavedFoods();
      }
    }
  }, [visible, activeTab]);

  const checkForScannedIngredient = async () => {
    try {
      const scannedIng = await storage.get<RecipeIngredient | null>('TEMP_SCANNED_INGREDIENT', undefined);
      if (scannedIng) {
        // Clear the temp storage
        await storage.set('TEMP_SCANNED_INGREDIENT', null);
        // Select the ingredient
        onSelect(scannedIng);
      }
    } catch (error) {
    }
  };

  const loadSavedFoods = async () => {
    try {
      setLoadingSavedFoods(true);
      const entries = await storage.get<any[]>(STORAGE_KEYS.FOOD_ENTRIES, []);
      if (entries) {
        // Group by unique food names and preserve weight info
        const foodMap = new Map<string, SavedFood>();
        entries.forEach((e) => {
          if (!foodMap.has(e.name)) {
            foodMap.set(e.name, {
              id: e.id || `food_${e.name}`,
              name: e.name,
              calories: e.calories || 0,
              protein: e.protein || 0,
              carbs: e.carbs || 0,
              fat: e.fat || 0,
              fiber: e.fiber || 0,
              weight: e.weight || e.weightInGrams || 100,
            });
          }
        });
        setSavedFoods(Array.from(foodMap.values()));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load saved foods');
    } finally {
      setLoadingSavedFoods(false);
    }
  };

  const persistWeight = async (weight: string) => {
    try {
      await storage.set(STORAGE_KEYS.LAST_INGREDIENT_WEIGHT, weight);
    } catch (error) {
    }
  };

  const handleManualSubmit = () => {
    if (!manualName.trim()) {
      Alert.alert('Error', 'Please enter ingredient name');
      return;
    }

    const trimmedName = manualName.trim();
    if (trimmedName.length > 50) {
      Alert.alert('Name Too Long', 'Please enter an ingredient name with 50 characters or less');
      return;
    }

    const calories = parseFloat(manualCalories) || 0;
    const weight = parseFloat(manualWeight) || 0;
    const protein = parseFloat(manualProtein) || 0;
    const carbs = parseFloat(manualCarbs) || 0;
    const fat = parseFloat(manualFat) || 0;
    const fiber = parseFloat(manualFiber) || 0;

    // Validate calories
    if (calories <= 0 || isNaN(calories)) {
      Alert.alert('Validation Error', 'Please enter calories greater than 0');
      return;
    }

    // Validate weight
    if (weight <= 0 || isNaN(weight)) {
      Alert.alert('Validation Error', 'Please enter weight greater than 0g');
      return;
    }
    
    if (weight > 10000) {
      Alert.alert('Validation Error', 'Maximum weight per ingredient is 10kg (10000g)');
      return;
    }

    // Validate macro nutrients are non-negative
    if (protein < 0 || carbs < 0 || fat < 0 || fiber < 0) {
      Alert.alert('Validation Error', 'Nutrients cannot be negative');
      return;
    }

    const ingredient: RecipeIngredient = {
      id: generateUniqueId('ing'),
      name: trimmedName,
      calories: parseFloat(calories.toFixed(2)),
      protein: parseFloat((parseFloat(manualProtein) || 0).toFixed(2)),
      carbs: parseFloat((parseFloat(manualCarbs) || 0).toFixed(2)),
      fat: parseFloat((parseFloat(manualFat) || 0).toFixed(2)),
      fiber: parseFloat((parseFloat(manualFiber) || 0).toFixed(2)),
      weightInGrams: parseFloat(weight.toFixed(2)),
    };

    onSelect(ingredient);
    persistWeight(manualWeight);
    resetManualForm();
    Keyboard.dismiss(); // Close keyboard
    onCancel(); // Close the selector to return to recipe builder
  };

  const handleSavedFoodSelect = (food: SavedFood | null) => {
    if (!food) {
      Alert.alert('Error', 'Please select a food item');
      return;
    }

    const weight = useExactAmount 
      ? (food.weight || 100)
      : (parseFloat(selectedAmount) || 100);
    
    // Validate weight
    if (weight <= 0 || isNaN(weight)) {
      Alert.alert('Validation Error', 'Please enter a valid weight greater than 0g');
      return;
    }

    const multiplier = weight / 100;

    const ingredient: RecipeIngredient = {
      id: generateUniqueId('ing'),
      name: food.name,
      calories: parseFloat((food.calories * multiplier).toFixed(2)),
      protein: parseFloat((food.protein * multiplier).toFixed(2)),
      carbs: parseFloat((food.carbs * multiplier).toFixed(2)),
      fat: parseFloat((food.fat * multiplier).toFixed(2)),
      fiber: parseFloat((food.fiber * multiplier).toFixed(2)),
      weightInGrams: weight,
    };

    onSelect(ingredient);
    persistWeight(String(weight));
    resetManualForm();
    Keyboard.dismiss(); // Close keyboard
    setSelectedFood(null);
    onCancel(); // Close the selector to return to recipe builder
  };

  const resetManualForm = () => {
    setManualName('');
    setManualCalories('');
    setManualProtein('');
    setManualCarbs('');
    setManualFat('');
    setManualFiber('');
    setManualWeight('100');
    setSelectedAmount('100');
    setSearchQuery('');
  };

  const filteredSavedFoods = useMemo(
    () => savedFoods.filter(food =>
      food.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [savedFoods, searchQuery]
  );

  const handleBasicIngredientSelect = (basicIngredient: typeof BASIC_INGREDIENTS[0]) => {
    const ingredient: RecipeIngredient = {
      id: generateUniqueId('ing'),
      name: basicIngredient.name,
      calories: parseFloat((basicIngredient.calories).toFixed(2)),
      protein: parseFloat((basicIngredient.protein).toFixed(2)),
      carbs: parseFloat((basicIngredient.carbs).toFixed(2)),
      fat: parseFloat((basicIngredient.fat).toFixed(2)),
      fiber: parseFloat((basicIngredient.fiber).toFixed(2)),
      weightInGrams: basicIngredient.defaultWeight,
    };

    onSelect(ingredient);
    persistWeight(String(basicIngredient.defaultWeight));
    Keyboard.dismiss(); // Close keyboard
    onCancel();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} hitSlop={10} accessibilityLabel="Close ingredient selector">
            <Text style={styles.closeButton}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Add Ingredient</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabs}>
          {(['scan', 'manual', 'basics', 'saved'] as const).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              hitSlop={8}
              accessibilityLabel={`${tab === 'scan' ? 'Scan' : tab === 'manual' ? 'Manual entry' : tab === 'basics' ? 'Basic ingredients' : 'Saved foods'} tab`}>
              <Text
                style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'scan' && 'Scan'}
                {tab === 'manual' && 'Manual'}
                {tab === 'basics' && 'Basics'}
                {tab === 'saved' && 'Saved'}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {activeTab === 'scan' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Scan a barcode</Text>
                <Pressable 
                  style={styles.scanButton} 
                  onPress={onScanPressed}
                  hitSlop={10}
                  accessibilityLabel="Open camera to scan barcode">
                  <Text style={styles.scanButtonText}>Open Camera</Text>
                </Pressable>
              </View>
            )}

            {activeTab === 'basics' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Common Ingredients</Text>
                <View style={styles.basicsGrid}>
                  {BASIC_INGREDIENTS.map((ingredient) => (
                    <Pressable
                      key={ingredient.name}
                      style={styles.basicIngredientCard}
                      onPress={() => handleBasicIngredientSelect(ingredient)}
                      hitSlop={8}>
                      <Text style={styles.basicIngredientName}>{ingredient.name}</Text>
                      <Text style={styles.basicIngredientWeight}>{ingredient.defaultWeight}g</Text>
                      <Text style={styles.basicIngredientCalories}>{Math.round(ingredient.calories * ingredient.defaultWeight / 100)} kcal</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {activeTab === 'manual' && (
              <View style={styles.section}>
                <Text style={styles.label}>Ingredient Name</Text>
                <TextInput
                  style={styles.input}
                  value={manualName}
                  onChangeText={setManualName}
                  placeholder="e.g., Chicken Breast"
                  placeholderTextColor="#b3b3b3"
                />

                <Text style={styles.label}>Weight (grams)</Text>
                <TextInput
                  style={styles.input}
                  value={manualWeight}
                  onChangeText={setManualWeight}
                  placeholder="100"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#b3b3b3"
                />

                <Text style={styles.sublabel}>Per 100g nutrition facts:</Text>

                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.label}>Calories</Text>
                    <TextInput
                      style={styles.smallInput}
                      value={manualCalories}
                      onChangeText={setManualCalories}
                      placeholder="0"
                      keyboardType="decimal-pad"
                      placeholderTextColor="#b3b3b3"
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Protein (g)</Text>
                    <TextInput
                      style={styles.smallInput}
                      value={manualProtein}
                      onChangeText={setManualProtein}
                      placeholder="0"
                      keyboardType="decimal-pad"
                      placeholderTextColor="#b3b3b3"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.label}>Carbs (g)</Text>
                    <TextInput
                      style={styles.smallInput}
                      value={manualCarbs}
                      onChangeText={setManualCarbs}
                      placeholder="0"
                      keyboardType="decimal-pad"
                      placeholderTextColor="#b3b3b3"
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Fat (g)</Text>
                    <TextInput
                      style={styles.smallInput}
                      value={manualFat}
                      onChangeText={setManualFat}
                      placeholder="0"
                      keyboardType="decimal-pad"
                      placeholderTextColor="#b3b3b3"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.label}>Fiber (g)</Text>
                    <TextInput
                      style={styles.smallInput}
                      value={manualFiber}
                      onChangeText={setManualFiber}
                      placeholder="0"
                      keyboardType="decimal-pad"
                      placeholderTextColor="#b3b3b3"
                    />
                  </View>
                </View>

                <Pressable 
                  style={styles.submitButton} 
                  onPress={handleManualSubmit}
                  hitSlop={10}
                  accessibilityLabel="Add manual ingredient">
                  <Text style={styles.submitButtonText}>✓ Add Ingredient</Text>
                </Pressable>
              </View>
            )}

            {activeTab === 'saved' && (
              <View style={styles.section}>
                {loadingSavedFoods ? (
                  <Text style={styles.emptyText}>Loading your food history...</Text>
                ) : savedFoods.length === 0 ? (
                  <Text style={styles.emptyText}>No saved foods yet. Scan some foods first!</Text>
                ) : selectedFood ? (
                  <View>
                    <View style={styles.selectedFoodCard}>
                      <Pressable 
                        onPress={() => {
                          setSelectedFood(null);
                          setUseExactAmount(false);
                        }}
                        hitSlop={10}
                        style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back</Text>
                      </Pressable>
                      <Text style={styles.selectedFoodName}>{selectedFood.name}</Text>
                      
                      <Text style={styles.portionModeTitle}>Choose portion size:</Text>
                      
                      <View style={styles.portionButtonsContainer}>
                        <Pressable 
                          style={[
                            styles.portionButton,
                            !useExactAmount && styles.portionButtonActive
                          ]}
                          onPress={() => setUseExactAmount(false)}
                          hitSlop={8}>
                          <Text style={[
                            styles.portionButtonText,
                            !useExactAmount && styles.portionButtonTextActive
                          ]}>
                            📏 Scale from 100g
                          </Text>
                          <Text style={[
                            styles.portionButtonSubtext,
                            !useExactAmount && styles.portionButtonSubtextActive
                          ]}>
                            Standard recipe portions
                          </Text>
                        </Pressable>
                        
                        <Pressable 
                          style={[
                            styles.portionButton,
                            useExactAmount && styles.portionButtonActive
                          ]}
                          onPress={() => setUseExactAmount(true)}
                          hitSlop={8}>
                          <Text style={[
                            styles.portionButtonText,
                            useExactAmount && styles.portionButtonTextActive
                          ]}>
                            ✓ Use exact {selectedFood.weight}g
                          </Text>
                          <Text style={[
                            styles.portionButtonSubtext,
                            useExactAmount && styles.portionButtonSubtextActive
                          ]}>
                            As you logged it
                          </Text>
                        </Pressable>
                      </View>

                      <View style={styles.portionPreviewCard}>
                        <View style={styles.previewRow}>
                          <Text style={styles.previewLabel}>Weight:</Text>
                          <Text style={styles.previewValue}>
                            {useExactAmount ? selectedFood.weight : selectedAmount}g
                          </Text>
                        </View>
                        <View style={styles.previewRow}>
                          <Text style={styles.previewLabel}>Calories:</Text>
                          <Text style={styles.previewValue}>
                            {Math.round(
                              selectedFood.calories * 
                              (useExactAmount 
                                ? (selectedFood.weight || 100) / 100
                                : parseFloat(selectedAmount) / 100
                              )
                            )}
                          </Text>
                        </View>
                        <View style={styles.previewRow}>
                          <Text style={styles.previewLabel}>Protein:</Text>
                          <Text style={styles.previewValue}>
                            {(selectedFood.protein * 
                              (useExactAmount 
                                ? (selectedFood.weight || 100) / 100
                                : parseFloat(selectedAmount) / 100
                              )
                            ).toFixed(1)}g
                          </Text>
                        </View>
                      </View>

                      {!useExactAmount && (
                        <View style={styles.customAmountContainer}>
                          <Text style={styles.label}>Custom amount (grams)</Text>
                          <TextInput
                            style={styles.input}
                            value={selectedAmount}
                            onChangeText={(text) => {
                              const num = parseFloat(text) || 0;
                              if (num >= 0) {
                                setSelectedAmount(text);
                              }
                            }}
                            placeholder="100"
                            keyboardType="decimal-pad"
                            placeholderTextColor="#b3b3b3"
                          />
                        </View>
                      )}

                      <Pressable 
                        style={styles.confirmButton}
                        onPress={() => handleSavedFoodSelect(selectedFood)}
                        hitSlop={10}>
                        <Text style={styles.confirmButtonText}>✓ Add to Recipe</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.label}>Select from your food history</Text>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="🔍 Search foods..."
                      placeholderTextColor="#b3b3b3"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {filteredSavedFoods.length === 0 ? (
                      <Text style={styles.emptyText}>No foods match your search</Text>
                    ) : (
                      filteredSavedFoods.map((food) => (
                      <View key={food.id} style={styles.savedFoodItem}>
                        <View style={styles.foodInfo}>
                          <Text style={styles.foodName}>{food.name}</Text>
                          <Text style={styles.foodNutrition}>
                            {Math.round(food.calories)} kcal • {Math.round(food.protein)}g protein
                            {food.weight && ` • ${food.weight}g saved`}
                          </Text>
                        </View>
                        <Pressable
                          style={styles.selectButton}
                          onPress={() => {
                            setSelectedFood(food);
                            setSelectedAmount(String(food.weight || 100));
                            setUseExactAmount(false);
                          }}
                          hitSlop={10}
                          accessibilityLabel={`Select ${food.name}`}>
                          <Text style={styles.selectButtonText}>+</Text>
                        </Pressable>
                      </View>
                      ))
                    )
                    }
                  </View>
                )}
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
    paddingBottom: 12,
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Palette.lightGray2,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Palette.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.gray,
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 12,
    color: Palette.gray,
    marginTop: 12,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Palette.darkGray,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  smallInput: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.darkGray,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  col: {
    flex: 1,
  },
  scanButton: {
    backgroundColor: Palette.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: Palette.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: Palette.gray,
    textAlign: 'center',
    paddingVertical: 24,
  },
  savedFoodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '500',
    color: Palette.darkGray,
    marginBottom: 4,
  },
  foodNutrition: {
    fontSize: 12,
    color: Palette.gray,
  },
  selectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  selectedFoodCard: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.primary,
  },
  selectedFoodName: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.darkGray,
    marginBottom: 16,
  },
  portionModeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 12,
  },
  portionButtonsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  portionButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: '#e8e8e8',
    backgroundColor: '#fff',
  },
  portionButtonActive: {
    borderColor: Palette.primary,
    backgroundColor: Palette.primary,
  },
  portionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 4,
  },
  portionButtonTextActive: {
    color: '#fff',
  },
  portionButtonSubtext: {
    fontSize: 12,
    color: Palette.gray,
  },
  portionButtonSubtextActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  portionPreviewCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  previewLabel: {
    fontSize: 13,
    color: Palette.gray,
    fontWeight: '500',
  },
  previewValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.darkGray,
  },
  customAmountContainer: {
    marginBottom: 16,
  },
  confirmButton: {
    backgroundColor: Palette.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  basicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  basicIngredientCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    alignItems: 'center',
  },
  basicIngredientName: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 4,
  },
  basicIngredientWeight: {
    fontSize: 12,
    color: Palette.gray,
    marginBottom: 4,
  },
  basicIngredientCalories: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.primary,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
    color: Palette.darkGray,
  },
});
