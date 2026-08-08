/**
 * GroceryList — aggregates all ingredients from a set of recipes into
 * a deduplicated, checkable shopping list.
 */
import { Palette } from '@/constants/theme';
import { Recipe } from '@/utils/recipes';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';

interface GroceryListProps {
  visible: boolean;
  isDark: boolean;
  recipes: Recipe[];
  onClose: () => void;
}

interface GroceryItem {
  name: string;
  totalWeight: number;
  checked: boolean;
}

export function GroceryList({ visible, isDark, recipes, onClose }: GroceryListProps) {
  const items = useMemo<GroceryItem[]>(() => {
    const map: Record<string, number> = {};
    recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ing) => {
        const key = ing.name.trim().toLowerCase();
        map[key] = (map[key] ?? 0) + ing.weightInGrams;
      });
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, totalWeight]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        totalWeight: Math.round(totalWeight),
        checked: false,
      }));
  }, [recipes]);

  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (name: string) => {
    setChecked((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleShare = async () => {
    const text = items
      .map((item) => `${checked[item.name] ? '☑' : '☐'} ${item.name} — ${item.totalWeight}g`)
      .join('\n');
    if (Platform.OS === 'web') {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        alert('Grocery list copied to clipboard!');
      }
    } else {
      await Share.share({ message: `🛒 Grocery List\n\n${text}` });
    }
  };

  const bg = isDark ? '#1e293b' : '#fff';
  const textColor = isDark ? '#f1f5f9' : '#111';
  const subColor = isDark ? '#94a3b8' : '#666';
  const itemBg = isDark ? '#0f172a' : '#f8fafc';

  const checkedCount = items.filter((i) => checked[i.name]).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: bg }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>🛒 Grocery List</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={[styles.cancelBtn, { color: subColor }]}>✕</Text>
            </Pressable>
          </View>
          <Text style={[styles.subtitle, { color: subColor }]}>
            {items.length} ingredients from {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} · {checkedCount} checked
          </Text>

          {items.length === 0 ? (
            <Text style={[styles.empty, { color: subColor }]}>
              No ingredients found. Create some recipes first.
            </Text>
          ) : (
            <ScrollView style={styles.list}>
              {items.map((item) => (
                <Pressable
                  key={item.name}
                  style={[styles.item, { backgroundColor: itemBg }]}
                  onPress={() => toggle(item.name)}>
                  <View
                    style={[
                      styles.checkbox,
                      checked[item.name] && styles.checkboxChecked,
                    ]}>
                    {checked[item.name] && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <View style={styles.itemContent}>
                    <Text
                      style={[
                        styles.itemName,
                        { color: textColor },
                        checked[item.name] && styles.itemNameChecked,
                      ]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.itemWeight, { color: subColor }]}>
                      {item.totalWeight}g
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={styles.row}>
            <Pressable
              style={[styles.btn, styles.btnSecondary]}
              onPress={() => setChecked({})}>
              <Text style={[styles.btnText, { color: Palette.primary }]}>Clear</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={handleShare}>
              <Text style={styles.btnText}>📤 Share / Copy</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  cancelBtn: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 14,
  },
  empty: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  list: {
    maxHeight: 380,
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Palette.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemNameChecked: {
    opacity: 0.4,
    textDecorationLine: 'line-through',
  },
  itemWeight: {
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    backgroundColor: Palette.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Palette.primary,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
