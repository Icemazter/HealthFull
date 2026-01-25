import { Palette } from '@/constants/theme';
import { Recipe } from '@/utils/recipes';
import React from 'react';
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
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🍳 Recipes</Text>
        <Pressable style={styles.addButton} onPress={onCreateNew}>
          <Text style={styles.addButtonText}>+ New Recipe</Text>
        </Pressable>
      </View>

      {recipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No recipes yet</Text>
          <Text style={styles.emptySubtext}>Create your first meal prep recipe</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {recipes.map((recipe) => (
            <Pressable
              key={recipe.id}
              style={styles.recipeCard}
              onPress={() => onSelectRecipe(recipe)}>
              <View style={styles.recipeHeader}>
                <Text style={styles.recipeName}>{recipe.name}</Text>
                <Pressable
                  onPress={() => {
                    Alert.alert('Delete Recipe', `Delete "${recipe.name}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => onDeleteRecipe(recipe.id),
                      },
                    ]);
                  }}>
                  <Text style={styles.deleteButton}>✕</Text>
                </Pressable>
              </View>
              <Text style={styles.recipeInfo}>
                {recipe.ingredients.length} ingredients • {recipe.totalWeightInGrams}g total
              </Text>
            </Pressable>
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.darkGray,
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
  recipeCard: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Palette.primary,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.darkGray,
    flex: 1,
  },
  deleteButton: {
    fontSize: 18,
    color: Palette.gray,
  },
  recipeInfo: {
    fontSize: 12,
    color: Palette.gray,
    marginTop: 8,
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
