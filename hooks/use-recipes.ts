import { createNewRecipe, Recipe } from '@/utils/recipes';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { useCallback, useEffect, useState } from 'react';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  // Load recipes from storage on mount
  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const stored = await storage.get<Recipe[]>(STORAGE_KEYS.RECIPES, []);
      setRecipes(stored ?? []);
    } catch (error) {
      console.error('Error loading recipes:', error);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveRecipes = useCallback(
    async (updatedRecipes: Recipe[]) => {
      try {
        await storage.set(STORAGE_KEYS.RECIPES, updatedRecipes);
        setRecipes(updatedRecipes);
      } catch (error) {
        console.error('Error saving recipes:', error);
      }
    },
    []
  );

  const addRecipe = useCallback(
    async (name: string) => {
      const newRecipe = createNewRecipe(name);
      const updated = [...recipes, newRecipe];
      await saveRecipes(updated);
      return newRecipe;
    },
    [recipes, saveRecipes]
  );

  const deleteRecipe = useCallback(
    async (recipeId: string) => {
      const updated = recipes.filter((r) => r.id !== recipeId);
      await saveRecipes(updated);
    },
    [recipes, saveRecipes]
  );

  const updateRecipe = useCallback(
    async (updatedRecipe: Recipe) => {
      const updated = recipes.map((r) =>
        r.id === updatedRecipe.id ? updatedRecipe : r
      );
      await saveRecipes(updated);
    },
    [recipes, saveRecipes]
  );

  return {
    recipes,
    loading,
    addRecipe,
    deleteRecipe,
    updateRecipe,
    loadRecipes,
  };
}
