import { Palette } from '@/constants/theme';
import { RecipeIngredient } from '@/utils/recipes';
import { STORAGE_KEYS, storage } from '@/utils/storage';
import React, { useState } from 'react';
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
}

export const IngredientSelector = React.memo(function IngredientSelector({
  visible,
  onSelect,
  onCancel,
  onScanPressed,
}: IngredientSelectorProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'saved'>('scan');
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [manualFiber, setManualFiber] = useState('');
  const [manualWeight, setManualWeight] = useState('100');
  const [savedFoods, setSavedFoods] = useState<SavedFood[]>([]);
  const [selectedAmount, setSelectedAmount] = useState('100');

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
      console.error('Error checking for scanned ingredient:', error);
    }
  };

  const loadSavedFoods = async () => {
    try {
      const entries = await storage.get<any[]>(STORAGE_KEYS.FOOD_ENTRIES, []);
      if (entries) {
        // Group by unique food names
        const uniqueFoods = Array.from(
          new Map(entries.map((e) => [e.name, e])).values()
        ) as SavedFood[];
        setSavedFoods(uniqueFoods);
      }
    } catch (error) {
      console.error('Error loading saved foods:', error);
    }
  };

  const handleManualSubmit = () => {
    if (!manualName.trim()) {
      Alert.alert('Error', 'Please enter ingredient name');
      return;
    }

    const ingredient: RecipeIngredient = {
      id: `ing_${Date.now()}`,
      name: manualName.trim(),
      calories: parseFloat(manualCalories) || 0,
      protein: parseFloat(manualProtein) || 0,
      carbs: parseFloat(manualCarbs) || 0,
      fat: parseFloat(manualFat) || 0,
      fiber: parseFloat(manualFiber) || 0,
      weightInGrams: parseFloat(manualWeight) || 100,
    };

    onSelect(ingredient);
    resetManualForm();
  };

  const handleSavedFoodSelect = (food: SavedFood) => {
    const weight = parseFloat(selectedAmount) || 100;
    const multiplier = weight / 100;

    const ingredient: RecipeIngredient = {
      id: `ing_${Date.now()}`,
      name: food.name,
      calories: food.calories * multiplier,
      protein: food.protein * multiplier,
      carbs: food.carbs * multiplier,
      fat: food.fat * multiplier,
      fiber: food.fiber * multiplier,
      weightInGrams: weight,
    };

    onSelect(ingredient);
    resetManualForm();
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
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} hitSlop={10}>
            <Text style={styles.closeButton}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Add Ingredient</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabs}>
          {(['scan', 'manual', 'saved'] as const).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              hitSlop={8}>
              <Text
                style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'scan' && '📷 Scan'}
                {tab === 'manual' && '✏️ Manual'}
                {tab === 'saved' && '⭐ Saved'}
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
                  hitSlop={10}>
                  <Text style={styles.scanButtonText}>📷 Open Camera</Text>
                </Pressable>
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
                  placeholderTextColor={Palette.gray}
                />

                <Text style={styles.label}>Weight (grams)</Text>
                <TextInput
                  style={styles.input}
                  value={manualWeight}
                  onChangeText={setManualWeight}
                  placeholder="100"
                  keyboardType="decimal-pad"
                  placeholderTextColor={Palette.gray}
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
                      placeholderTextColor={Palette.gray}
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
                      placeholderTextColor={Palette.gray}
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
                      placeholderTextColor={Palette.gray}
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
                      placeholderTextColor={Palette.gray}
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
                      placeholderTextColor={Palette.gray}
                    />
                  </View>
                </View>

                <Pressable 
                  style={styles.submitButton} 
                  onPress={handleManualSubmit}
                  hitSlop={10}>
                  <Text style={styles.submitButtonText}>✓ Add Ingredient</Text>
                </Pressable>
              </View>
            )}

            {activeTab === 'saved' && (
              <View style={styles.section}>
                {savedFoods.length === 0 ? (
                  <Text style={styles.emptyText}>No saved foods yet. Scan some foods first!</Text>
                ) : (
                  <View>
                    <Text style={styles.label}>Select from your food history</Text>
                    {savedFoods.map((food) => (
                      <View key={food.id} style={styles.savedFoodItem}>
                        <View style={styles.foodInfo}>
                          <Text style={styles.foodName}>{food.name}</Text>
                          <Text style={styles.foodNutrition}>
                            {Math.round(food.calories)} kcal • {Math.round(food.protein)}g protein
                          </Text>
                        </View>
                        <Pressable
                          style={styles.selectButton}
                          onPress={() => handleSavedFoodSelect(food)}
                          hitSlop={10}>
                          <Text style={styles.selectButtonText}>+</Text>
                        </Pressable>
                      </View>
                    ))}
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
  },
  smallInput: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.darkGray,
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
});
