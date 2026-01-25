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

interface ManualEntryModalProps {
  visible: boolean;
  onAdd: (entry: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }) => void;
  onCancel: () => void;
}

export const ManualEntryModal = React.memo(function ManualEntryModal({
  visible,
  onAdd,
  onCancel,
}: ManualEntryModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('0');

  const handleAdd = () => {
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
    });

    // Reset form
    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setFiber('0');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} hitSlop={10}>
            <Text style={styles.cancelButton}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Manual Entry</Text>
          <Pressable style={styles.addButton} onPress={handleAdd} hitSlop={10}>
            <Text style={styles.addButtonText}>Add</Text>
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
              💡 Enter nutrition values per 100g. This will be used as a baseline for all portions.
            </Text>
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
  addButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
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
});
