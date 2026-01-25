import { Palette } from '@/constants/theme';
import { FoodEntry } from '@/hooks/use-food-manager';
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

interface EditEntryModalProps {
  visible: boolean;
  entry: FoodEntry | null;
  onSave: (updatedEntry: FoodEntry) => void;
  onCancel: () => void;
}

export const EditEntryModal = React.memo(function EditEntryModal({
  visible,
  entry,
  onSave,
  onCancel,
}: EditEntryModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(entry?.name || '');
  const [calories, setCalories] = useState((entry?.calories || 0).toString());
  const [protein, setProtein] = useState((entry?.protein || 0).toString());
  const [carbs, setCarbs] = useState((entry?.carbs || 0).toString());
  const [fat, setFat] = useState((entry?.fat || 0).toString());
  const [fiber, setFiber] = useState((entry?.fiber || 0).toString());
  const [mealType, setMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>(
    (entry?.mealType as 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack') || 'Lunch'
  );

  React.useEffect(() => {
    if (entry) {
      setName(entry.name);
      setCalories(entry.calories.toString());
      setProtein(entry.protein.toString());
      setCarbs(entry.carbs.toString());
      setFat(entry.fat.toString());
      setFiber((entry.fiber || 0).toString());
      setMealType((entry.mealType as 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack') || 'Lunch');
    }
  }, [entry]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a food name');
      return;
    }

    if (!entry) return;

    const cals = parseFloat(calories) || 0;
    const prot = parseFloat(protein) || 0;
    const crbs = parseFloat(carbs) || 0;
    const ft = parseFloat(fat) || 0;
    const fb = parseFloat(fiber) || 0;

    const updatedEntry: FoodEntry = {
      ...entry,
      name: name.trim(),
      calories: cals,
      protein: prot,
      carbs: crbs,
      fat: ft,
      fiber: fb,
      mealType: mealType,
    };

    onSave(updatedEntry);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} hitSlop={10}>
            <Text style={styles.cancelButton}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Edit Entry</Text>
          <Pressable style={styles.saveButton} onPress={handleSave} hitSlop={10}>
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.label}>Food Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Chicken Breast"
              placeholderTextColor={Palette.gray}
            />
          </View>

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
                  onPress={() => setMealType(meal)}
                  hitSlop={8}
                >
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

          <View style={styles.section}>
            <Text style={styles.label}>Nutrition Facts</Text>

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
              <View style={styles.col} />
            </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  section: {
    marginBottom: 24,
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
    paddingVertical: 12,
    fontSize: 16,
    color: Palette.darkGray,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  smallInput: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
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
});
