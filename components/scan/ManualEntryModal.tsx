import { Palette } from '@/constants/theme';
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

// Basic ingredients with average macros per 100g (shared from IngredientSelector)
const BASIC_INGREDIENTS = [
  { name: 'Egg', calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, defaultWeight: 50 },
  { name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, defaultWeight: 100 },
  { name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, defaultWeight: 100 },
  { name: 'Rice (cooked)', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, defaultWeight: 100 },
  { name: 'Pasta (cooked)', calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, defaultWeight: 100 },
  { name: 'Oats', calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 10.6, defaultWeight: 40 },
  { name: 'Broccoli', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.4, defaultWeight: 100 },
  { name: 'Sweet Potato', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, defaultWeight: 100 },
  { name: 'Salmon', calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, defaultWeight: 100 },
  { name: 'Milk', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0, defaultWeight: 100 },
  { name: 'Almonds', calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5, defaultWeight: 28 },
  { name: 'Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, defaultWeight: 100 },
  { name: 'Beef', calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0, defaultWeight: 100 },
  { name: 'Peanut Butter', calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6, defaultWeight: 32 },
  { name: 'Bread', calories: 265, protein: 9, carbs: 49, fat: 3.3, fiber: 2.7, defaultWeight: 30 },
  { name: 'Olive Oil', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, defaultWeight: 14 },
  { name: 'Yogurt', calories: 59, protein: 10, carbs: 3.3, fat: 0.4, fiber: 0, defaultWeight: 100 },
  { name: 'Blueberries', calories: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4, defaultWeight: 100 },
];

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
  const [activeTab, setActiveTab] = useState<'manual' | 'basics'>('manual');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('0');
  const [mealType, setMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>('Lunch');
  const [selectedBasic, setSelectedBasic] = useState<typeof BASIC_INGREDIENTS[0] | null>(null);
  const [basicWeight, setBasicWeight] = useState('100');

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
            disabled={activeTab === 'basics' && !selectedBasic}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        <View style={styles.tabsContainer}>
          {(['manual', 'basics'] as const).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              hitSlop={8}>
              <Text
                style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'manual' ? 'Manual' : 'Basics'}
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
});
