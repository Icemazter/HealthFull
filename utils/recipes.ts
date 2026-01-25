/**
 * Recipe management utilities for meal prep composition
 * Allows users to create composite meals from multiple ingredients
 * and scale portions for meal prep containers
 */

export interface RecipeIngredient {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  weightInGrams: number; // weight of this ingredient in the recipe
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  totalWeightInGrams: number; // total weight of the complete recipe
  createdAt: number;
  lastModified: number;
}

/**
 * Calculate total nutrition for all ingredients in a recipe
 */
export function calculateRecipeNutrition(ingredients: RecipeIngredient[]) {
  return ingredients.reduce(
    (totals, ingredient) => ({
      calories: totals.calories + ingredient.calories,
      protein: totals.protein + ingredient.protein,
      carbs: totals.carbs + ingredient.carbs,
      fat: totals.fat + ingredient.fat,
      fiber: totals.fiber + ingredient.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

/**
 * Scale recipe nutrition by a portion size in grams
 * Example: recipe is 1000g, you want 300g portion
 * returns nutrition for 300g
 */
export function portionRecipe(
  recipe: Recipe,
  portionSizeInGrams: number
) {
  const recipeTotalNutrition = calculateRecipeNutrition(recipe.ingredients);
  const scaleFactor = portionSizeInGrams / recipe.totalWeightInGrams;

  return {
    calories: recipeTotalNutrition.calories * scaleFactor,
    protein: recipeTotalNutrition.protein * scaleFactor,
    carbs: recipeTotalNutrition.carbs * scaleFactor,
    fat: recipeTotalNutrition.fat * scaleFactor,
    fiber: recipeTotalNutrition.fiber * scaleFactor,
  };
}

/**
 * Calculate nutrition per 100g of the recipe
 * Useful for displaying nutritional info like scanned products
 */
export function getNutritionPer100g(recipe: Recipe) {
  return portionRecipe(recipe, 100);
}

/**
 * Add ingredient to recipe and update total weight
 */
export function addIngredientToRecipe(
  recipe: Recipe,
  ingredient: RecipeIngredient
): Recipe {
  const updatedIngredients = [...recipe.ingredients, ingredient];
  const totalWeight = updatedIngredients.reduce(
    (sum, ing) => sum + ing.weightInGrams,
    0
  );

  return {
    ...recipe,
    ingredients: updatedIngredients,
    totalWeightInGrams: totalWeight,
    lastModified: Date.now(),
  };
}

/**
 * Remove ingredient from recipe
 */
export function removeIngredientFromRecipe(
  recipe: Recipe,
  ingredientId: string
): Recipe {
  const updatedIngredients = recipe.ingredients.filter(
    (ing) => ing.id !== ingredientId
  );
  const totalWeight = updatedIngredients.reduce(
    (sum, ing) => sum + ing.weightInGrams,
    0
  );

  return {
    ...recipe,
    ingredients: updatedIngredients,
    totalWeightInGrams: totalWeight,
    lastModified: Date.now(),
  };
}

/**
 * Update ingredient weight in recipe
 */
export function updateIngredientWeight(
  recipe: Recipe,
  ingredientId: string,
  newWeightInGrams: number
): Recipe {
  const updatedIngredients = recipe.ingredients.map((ing) =>
    ing.id === ingredientId
      ? { ...ing, weightInGrams: newWeightInGrams }
      : ing
  );
  const totalWeight = updatedIngredients.reduce(
    (sum, ing) => sum + ing.weightInGrams,
    0
  );

  return {
    ...recipe,
    ingredients: updatedIngredients,
    totalWeightInGrams: totalWeight,
    lastModified: Date.now(),
  };
}

/**
 * Create a new empty recipe
 */
export function createNewRecipe(name: string): Recipe {
  return {
    id: `recipe_${Date.now()}`,
    name,
    ingredients: [],
    totalWeightInGrams: 0,
    createdAt: Date.now(),
    lastModified: Date.now(),
  };
}
