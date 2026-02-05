import { BASIC_INGREDIENTS } from '@/constants/basic-ingredients';
import { Palette } from '@/constants/theme';
import { storage } from '@/utils/storage';
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

// Utility for generating unique IDs
const generateUniqueId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

interface ManualEntryModalProps {
  visible: boolean;
  onAdd: (entry: {
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

export const ManualEntryModal = React.memo(function ManualEntryModal({
  visible,
  onAdd,
  onCancel,
}: ManualEntryModalProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'manual' | 'basics' | 'saved'>('manual');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('0');
  const [mealType, setMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>('Lunch');
  const [selectedBasic, setSelectedBasic] = useState<typeof BASIC_INGREDIENTS[0] | null>(null);
  const [basicWeight, setBasicWeight] = useState('100');
  const [savedFoods, setSavedFoods] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    if (visible && activeTab === 'saved') {
      loadSavedFoods();
    }
  }, [visible, activeTab]);

  const loadSavedFoods = async () => {
    try {
      const entries = await storage.get<any[]>('FOOD_ENTRIES', []);
      if (entries && entries.length > 0) {
        const foods = entries.map(entry => ({
          id: entry.id,
          name: entry.name,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          fiber: entry.fiber || 0,
          weight: 100,
        }));
        setSavedFoods(foods);
      }
    } catch (error) {
      console.error('Failed to load saved foods:', error);
    }
  };

  const filteredSavedFoods = useMemo(
    () => savedFoods.filter(food =>
      food.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [savedFoods, searchQuery]
  );

  const handleSavedFoodSelect = (food: any) => {
    const weight = parseFloat(basicWeight) || 100;
    const multiplier = weight / 100;

    onAdd({
      name: food.name,
      calories: parseFloat((food.calories * multiplier).toFixed(2)),
      protein: parseFloat((food.protein * multiplier).toFixed(2)),
      carbs: parseFloat((food.carbs * multiplier).toFixed(2)),
      fat: parseFloat((food.fat * multiplier).toFixed(2)),
      fiber: parseFloat((food.fiber * multiplier).toFixed(2)),
      mealType: mealType,
    });

    // Reset form
    setSelectedBasic(null);
    setBasicWeight('100');
    setSearchQuery('');
  };

  const handleAdd = () => {
    if (activeTab === 'manual') {
      if (!name.trim()) {
        alert('Please enter a food name');
        return;
      }

      const cals = parseFloat(calories) || 0;
      const prot = parseFloat(protein) || 0;
      const crbs = parseFloat(carbs) || 0;
      const ft = parseFloat(fat) || 0;
      const fb = parseFloat(fiber) || 0;

      onAdd({
        name: name.trim(),
        calories: cals,
        protein: prot,
        carbs: crbs,
        fat: ft,
        fiber: fb,
        mealType: mealType,
      });

      // Reset form
      setName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setFiber('0');
    } else if (activeTab === 'basics' && selectedBasic) {
      // Calculate macros for the selected weight
      const weight = parseFloat(basicWeight) || 100;
      const weightRatio = weight / 100;

      onAdd({
        name: selectedBasic.name,
        calories: parseFloat((selectedBasic.calories * weightRatio).toFixed(2)),
        protein: parseFloat((selectedBasic.protein * weightRatio).toFixed(2)),
        carbs: parseFloat((selectedBasic.carbs * weightRatio).toFixed(2)),
        fat: parseFloat((selectedBasic.fat * weightRatio).toFixed(2)),
        fiber: parseFloat((selectedBasic.fiber * weightRatio).toFixed(2)),
        mealType: mealType,
      });

      // Reset form
      setSelectedBasic(null);
      setBasicWeight('100');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} hitSlop={10}>
            <Text style={styles.cancelButton}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Add Food</Text>
          <Pressable 
            style={[styles.addButton, (activeTab === 'basics' && !selectedBasic) && styles.addButtonDisabled]} 
            onPress={handleAdd} 
            hitSlop={10}
            disabled={(activeTab === 'basics' && !selectedBasic) || (activeTab === 'saved' && !selectedBasic)}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        <View style={styles.tabsContainer}>
          {(['manual', 'basics', 'saved'] as const).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              hitSlop={8}>
              <Text
                style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'manual' ? 'Manual' : tab === 'basics' ? 'Basics' : 'Saved'}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.label}>Meal Type</Text>
            <View style={styles.mealTypeRow}>
              {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((meal) => (
                <Pressable
                  key={meal}
                  style={[
                    styles.mealTypeButton,
                    mealType === meal && styles.mealTypeButtonActive
                  ]}
                  onPress={() => setMealType(meal)}>
                  <Text style={[
                    styles.mealTypeButtonText,
                    mealType === meal && styles.mealTypeButtonTextActive
                  ]}>
                    {meal}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {activeTab === 'manual' && (
            <>
              <View style={styles.section}>
                <Text style={styles.label}>Food Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Chicken Breast"
                  placeholderTextColor={Palette.gray}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Per 100g Nutrition Facts</Text>

                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.label}>Calories</Text>
                    <TextInput
                      style={styles.smallInput}
                      value={calories}
                      onChangeText={setCalories}
                      placeholder="0"
                      keyboardType="decimal-pad"
                      placeholderTextColor={Palette.gray}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Protein (g)</Text>
                    <TextInput
                      style={styles.smallInput}
                      value={protein}
                      onChangeText={setProtein}
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
                      value={carbs}
                      onChangeText={setCarbs}
                      placeholder="0"
                      keyboardType="decimal-pad"
                      placeholderTextColor={Palette.gray}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Fat (g)</Text>
                    <TextInput
                      style={styles.smallInput}
                      value={fat}
                      onChangeText={setFat}
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
                      value={fiber}
                      onChangeText={setFiber}
                      placeholder="0"
                      keyboardType="decimal-pad"
                      placeholderTextColor={Palette.gray}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.note}>
                <Text style={styles.noteText}>
                  Enter nutrition values per 100g. This will be used as a baseline for all portions.
                </Text>
              </View>
            </>
          )}

          {activeTab === 'basics' && (
            <View style={styles.section}>
              <Text style={styles.label}>Select a Food</Text>
              <View style={styles.basicsGrid}>
                {BASIC_INGREDIENTS.map((ingredient) => (
                  <Pressable
                    key={ingredient.name}
                    style={[
                      styles.basicIngredientCard,
                      selectedBasic?.name === ingredient.name && styles.basicIngredientCardActive
                    ]}
                    onPress={() => {
                      setSelectedBasic(ingredient);
                      setBasicWeight(ingredient.defaultWeight.toString());
                    }}>
                    <Text style={[
                      styles.basicIngredientName,
                      selectedBasic?.name === ingredient.name && styles.basicIngredientNameActive
                    ]}>
                      {ingredient.name}
                    </Text>
                    <Text style={[
                      styles.basicIngredientMacro,
                      selectedBasic?.name === ingredient.name && styles.basicIngredientMacroActive
                    ]}>
                      {Math.round(ingredient.calories * (ingredient.defaultWeight / 100))} cal
                    </Text>
                  </Pressable>
                ))}
              </View>

              {selectedBasic && (
                <View style={styles.section}>
                  <Text style={styles.label}>Weight (grams)</Text>
                  <TextInput
                    style={styles.input}
                    value={basicWeight}
                    onChangeText={setBasicWeight}
                    placeholder="100"
                    keyboardType="decimal-pad"
                    placeholderTextColor={Palette.gray}
                  />
                  
                  <View style={styles.nutritionPreviewCard}>
                    <Text style={styles.previewTitle}>{selectedBasic.name}</Text>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Calories:</Text>
                      <Text style={styles.previewValue}>
                        {Math.round(selectedBasic.calories * (parseFloat(basicWeight) / 100))}
                      </Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Protein:</Text>
                      <Text style={styles.previewValue}>
                        {(selectedBasic.protein * (parseFloat(basicWeight) / 100)).toFixed(1)}g
                      </Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Carbs:</Text>
                      <Text style={styles.previewValue}>
                        {(selectedBasic.carbs * (parseFloat(basicWeight) / 100)).toFixed(1)}g
                      </Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Fat:</Text>
                      <Text style={styles.previewValue}>
                        {(selectedBasic.fat * (parseFloat(basicWeight) / 100)).toFixed(1)}g
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {activeTab === 'saved' && (
            <View style={styles.section}>
              <Text style={styles.label}>Select from saved foods</Text>
              <TextInput
                style={styles.input}
                placeholder="Search foods..."
                placeholderTextColor={Palette.gray}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {filteredSavedFoods.length === 0 ? (
                <Text style={styles.emptyText}>No saved foods yet</Text>
              ) : (
                <View style={styles.savedFoodsContainer}>
                  {filteredSavedFoods.map((food) => (
                    <Pressable
                      key={food.id}
                      style={styles.savedFoodItem}
                      onPress={() => {
                        setSelectedBasic(food as any);
                        setBasicWeight('100');
                      }}>
                      <View style={styles.foodInfo}>
                        <Text style={styles.foodName}>{food.name}</Text>
                        <Text style={styles.foodNutrition}>
                          {Math.round(food.calories)} cal · {food.protein.toFixed(1)}p · {food.carbs.toFixed(1)}c · {food.fat.toFixed(1)}f
                        </Text>
                      </View>
                      <Pressable
                        style={styles.selectFoodButton}
                        onPress={() => handleSavedFoodSelect(food)}
                        hitSlop={8}>
                        <Text style={styles.selectFoodButtonText}>+</Text>
                      </Pressable>
                    </Pressable>
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
  addButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.lightGray2,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Palette.lightGray2,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.darkGray,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 8,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mealTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.lightGray2,
    alignItems: 'center',
  },
  mealTypeButtonActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  mealTypeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Palette.darkGray,
  },
  mealTypeButtonTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Palette.darkGray,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  col: {
    flex: 1,
  },
  smallInput: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.darkGray,
  },
  note: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  noteText: {
    fontSize: 12,
    color: Palette.gray,
    lineHeight: 16,
  },
  basicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  basicIngredientCard: {
    width: '48%',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Palette.lightGray2,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  basicIngredientCardActive: {
    borderColor: Palette.primary,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  basicIngredientName: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 4,
    textAlign: 'center',
  },
  basicIngredientNameActive: {
    color: Palette.primary,
  },
  basicIngredientMacro: {
    fontSize: 11,
    color: Palette.gray,
    textAlign: 'center',
  },
  basicIngredientMacroActive: {
    color: Palette.primary,
    fontWeight: '600',
  },
  nutritionPreviewCard: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 10,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  previewLabel: {
    fontSize: 12,
    color: Palette.gray,
  },
  previewValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.darkGray,
  },
  emptyText: {
    fontSize: 14,
    color: Palette.gray,
    textAlign: 'center',
    paddingVertical: 24,
  },
  savedFoodsContainer: {
    gap: 8,
  },
  savedFoodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
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
  selectFoodButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  selectFoodButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },});