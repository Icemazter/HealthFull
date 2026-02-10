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

export interface MealPrepIngredient {
  ingredientId: string;
  name: string;
  weightInGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface MealPrep {
  id: string;
  boxNumber: number;
  label: string;
  ingredients: MealPrepIngredient[];
  totalWeightInGrams: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  totalWeightInGrams: number; // total weight of the complete recipe
  mealpreps?: MealPrep[];
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
  // Ensure we have valid numbers
  if (!portionSizeInGrams || portionSizeInGrams <= 0 || !recipe.totalWeightInGrams) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }

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
/**
 * Generate evenly divided mealpreps from a recipe.
 * Each box gets an equal share of each ingredient by default.
 */
export function generateMealPreps(recipe: Recipe, boxCount: number): MealPrep[] {
  if (boxCount <= 0 || recipe.ingredients.length === 0) return [];

  return Array.from({ length: boxCount }, (_, i) => {
    const ingredients: MealPrepIngredient[] = recipe.ingredients.map((ing) => {
      const dividedWeight = parseFloat((ing.weightInGrams / boxCount).toFixed(1));
      const ratio = ing.weightInGrams > 0 ? dividedWeight / ing.weightInGrams : 0;
      return {
        ingredientId: ing.id,
        name: ing.name,
        weightInGrams: dividedWeight,
        calories: parseFloat((ing.calories * ratio).toFixed(1)),
        protein: parseFloat((ing.protein * ratio).toFixed(1)),
        carbs: parseFloat((ing.carbs * ratio).toFixed(1)),
        fat: parseFloat((ing.fat * ratio).toFixed(1)),
        fiber: parseFloat((ing.fiber * ratio).toFixed(1)),
      };
    });

    const totalWeight = ingredients.reduce((sum, ing) => sum + ing.weightInGrams, 0);

    return {
      id: `mealprep_${Date.now()}_${i}`,
      boxNumber: i + 1,
      label: `Box ${i + 1}`,
      ingredients,
      totalWeightInGrams: parseFloat(totalWeight.toFixed(1)),
    };
  });
}

/**
 * Calculate total nutrition for a single mealprep box
 */
export function calculateMealPrepNutrition(mealprep: MealPrep) {
  return mealprep.ingredients.reduce(
    (totals, ing) => ({
      calories: totals.calories + ing.calories,
      protein: totals.protein + ing.protein,
      carbs: totals.carbs + ing.carbs,
      fat: totals.fat + ing.fat,
      fiber: totals.fiber + ing.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

/**
 * Recalculate a mealprep ingredient's nutrition after weight adjustment
 */
export function adjustMealPrepIngredientWeight(
  mealprep: MealPrep,
  ingredientId: string,
  newWeight: number,
  originalRecipeIngredient: RecipeIngredient
): MealPrep {
  const updatedIngredients = mealprep.ingredients.map((ing) => {
    if (ing.ingredientId !== ingredientId) return ing;
    
    // Calculate ratio from the original recipe ingredient's per-unit nutrition
    const originalRatio = originalRecipeIngredient.weightInGrams > 0
      ? newWeight / originalRecipeIngredient.weightInGrams
      : 0;

    return {
      ...ing,
      weightInGrams: parseFloat(newWeight.toFixed(1)),
      calories: parseFloat((originalRecipeIngredient.calories * originalRatio).toFixed(1)),
      protein: parseFloat((originalRecipeIngredient.protein * originalRatio).toFixed(1)),
      carbs: parseFloat((originalRecipeIngredient.carbs * originalRatio).toFixed(1)),
      fat: parseFloat((originalRecipeIngredient.fat * originalRatio).toFixed(1)),
      fiber: parseFloat((originalRecipeIngredient.fiber * originalRatio).toFixed(1)),
    };
  });

  const totalWeight = updatedIngredients.reduce((sum, ing) => sum + ing.weightInGrams, 0);

  return {
    ...mealprep,
    ingredients: updatedIngredients,
    totalWeightInGrams: parseFloat(totalWeight.toFixed(1)),
  };
}