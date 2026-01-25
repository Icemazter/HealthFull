import { Palette } from '@/constants/theme';
import { Recipe } from '@/utils/recipes';
import React, { useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

interface RecipeListProps {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (recipeId: string) => void;
  onCreateNew: () => void;
}

export const RecipesList = React.memo(function RecipesList({
  recipes,
  onSelectRecipe,
  onDeleteRecipe,
  onCreateNew,
}: RecipeListProps) {
  const [editMode, setEditMode] = useState(false);

  const handleDelete = (recipe: Recipe) => {
    Alert.alert(
      'Delete Recipe',
      `Are you sure you want to delete "${recipe.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDeleteRecipe(recipe.id);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🍳 Recipes</Text>
        <View style={styles.headerButtons}>
          {recipes.length > 0 && (
            <Pressable
              style={[styles.editButton, editMode && styles.editButtonActive]}
              onPress={() => setEditMode(!editMode)}>
              <Text style={[styles.editButtonText, editMode && styles.editButtonTextActive]}>
                {editMode ? 'Done' : 'Edit'}
              </Text>
            </Pressable>
          )}
          <Pressable style={styles.addButton} onPress={onCreateNew}>
            <Text style={styles.addButtonText}>+ New</Text>
          </Pressable>
        </View>
      </View>

      {recipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No recipes yet</Text>
          <Text style={styles.emptySubtext}>Create your first meal prep recipe</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {recipes.map((recipe) => (
            <View key={recipe.id} style={styles.recipeRow}>
              {editMode && (
                <Pressable
                  style={styles.deleteCircle}
                  onPress={() => handleDelete(recipe)}>
                  <Text style={styles.deleteCircleText}>−</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.recipeCard, editMode && styles.recipeCardEdit]}
                onPress={() => !editMode && onSelectRecipe(recipe)}>
                <View style={styles.recipeContent}>
                  <Text style={styles.recipeName}>{recipe.name}</Text>
                  <Text style={styles.recipeInfo}>
                    {recipe.ingredients.length} ingredients • {recipe.totalWeightInGrams}g total
                  </Text>
                </View>
                {!editMode && <Text style={styles.chevron}>›</Text>}
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.darkGray,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.primary,
  },
  editButtonActive: {
    backgroundColor: Palette.primary,
  },
  editButtonText: {
    color: Palette.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  editButtonTextActive: {
    color: '#fff',
  },
  addButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    maxHeight: 300,
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  deleteCircleText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  recipeCard: {
    flex: 1,
    backgroundColor: Palette.lightGray2,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: Palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeCardEdit: {
    opacity: 0.8,
  },
  recipeContent: {
    flex: 1,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.darkGray,
  },
  recipeInfo: {
    fontSize: 12,
    color: Palette.gray,
    marginTop: 4,
  },
  chevron: {
    fontSize: 24,
    color: Palette.gray,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.gray,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: Palette.gray,
  },
});
