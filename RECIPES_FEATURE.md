# Recipe System Feature Documentation

## Overview
The recipe system enables users to create custom meal compositions with flexible portioning. Users can build recipes by adding ingredients from three sources: scanned barcodes, manually entered nutrition facts, or previously logged foods.

## Architecture

### Data Layer
**File:** [utils/recipes.ts](utils/recipes.ts)

**Data Structures:**
```typescript
interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  totalWeightInGrams: number;
  createdAt: number;
  updatedAt: number;
}

interface RecipeIngredient {
  id: string;
  name: string;
  weightInGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}
```

**Utility Functions:**
- `createNewRecipe(name: string)` - Factory function to create a new recipe
- `addIngredientToRecipe(recipe, ingredient)` - Add ingredient to recipe
- `removeIngredientFromRecipe(recipe, ingredientId)` - Remove ingredient
- `updateIngredientWeight(recipe, ingredientId, newWeight)` - Update ingredient weight
- `calculateRecipeNutrition(ingredients)` - Total nutrition for all ingredients
- `portionRecipe(recipe, portionSizeInGrams)` - Scale recipe nutrition by gram portion
- `getNutritionPer100g(ingredient)` - Calculate macro density

### State Management
**File:** [hooks/use-recipes.ts](hooks/use-recipes.ts)

**Hook:** `useRecipes()`

**Methods:**
- `loadRecipes()` - Load all recipes from AsyncStorage
- `saveRecipes(recipes)` - Persist recipes to AsyncStorage
- `addRecipe(name)` - Create and save new recipe
- `deleteRecipe(recipeId)` - Remove recipe
- `updateRecipe(recipe)` - Update existing recipe

**Returns:**
```typescript
{
  recipes: Recipe[];
  addRecipe: (name: string) => Promise<Recipe>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  updateRecipe: (recipe: Recipe) => Promise<void>;
}
```

### UI Components

#### 1. RecipesList
**File:** [components/recipes/RecipesList.tsx](components/recipes/RecipesList.tsx)

Displays all created recipes with:
- Recipe name and ingredient count
- Total weight indicator
- Edit and delete buttons
- Empty state message
- "New Recipe" button

**Props:**
```typescript
{
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (recipeId: string) => void;
  onCreateNew: () => void;
}
```

#### 2. RecipeBuilder
**File:** [components/recipes/RecipeBuilder.tsx](components/recipes/RecipeBuilder.tsx)

Modal for editing recipe details:
- Recipe name input field
- Ingredients list with:
  - Ingredient name, weight, and macros
  - Delete button per ingredient
- Total nutrition summary (calories, protein, carbs, fat, fiber)
- "Add Ingredient" button (opens IngredientSelector)
- Save/Cancel buttons

**Props:**
```typescript
{
  visible: boolean;
  recipe: Recipe;
  onSave: (recipe: Recipe) => void;
  onCancel: () => void;
  onAddIngredientPressed: () => void;
}
```

#### 3. IngredientSelector
**File:** [components/recipes/IngredientSelector.tsx](components/recipes/IngredientSelector.tsx)

Modal with 3 tabs for adding ingredients:

**Tab 1: Scan (📷)**
- Opens camera for barcode scanning
- Fetches nutrition data from OpenFoodFacts API
- Converts to ingredient with auto-detected weight

**Tab 2: Manual (✏️)**
- Text inputs for:
  - Ingredient name
  - Weight in grams (default: 100g)
  - Calories, Protein, Carbs, Fat, Fiber
- Form validation before adding

**Tab 3: Saved (⭐)**
- Lists all previously scanned foods from FOOD_ENTRIES
- Select button to choose ingredient
- Weight selector (scales nutrition proportionally)
- Shows calculated macros for selected weight

**Props:**
```typescript
{
  visible: boolean;
  onSelect: (ingredient: RecipeIngredient) => void;
  onCancel: () => void;
  onScanPressed: () => void;
}
```

### Integration

**File:** [app/(tabs)/index.tsx](app/(tabs)/index.tsx#L27-L40)

Recipe system is integrated into the Nutrition tab with:
- RecipesList display showing all user recipes
- State management for recipe builder and ingredient selector modals
- Handler functions:
  - `handleCreateRecipe()` - Prompt for name, create new recipe
  - `handleSelectRecipe(recipe)` - Open recipe for editing
  - `handleSaveRecipe(recipe)` - Save recipe changes
  - `handleAddIngredient(ingredient)` - Add ingredient to current recipe

## User Workflows

### Creating a New Recipe
1. Click "+ New Recipe" in RecipesList
2. Enter recipe name in Alert prompt
3. RecipeBuilder modal opens with empty recipe
4. Click "Add Ingredient" to open IngredientSelector
5. Choose ingredient source:
   - Scan barcode → fetch food data
   - Enter manually → type nutrition facts
   - Select saved → pick from previous scans
6. Add multiple ingredients as needed
7. Click Save to persist recipe

### Editing a Recipe
1. Click on recipe in list
2. RecipeBuilder modal opens with current ingredients
3. Edit recipe name in text field
4. Add/remove ingredients as needed
5. Click Save to update

### Viewing Recipe Nutrition
- Total nutrition displayed in RecipeBuilder summary
- Automatically calculated from all ingredients
- Per-ingredient breakdown shown in ingredients list

### Portioning a Recipe
When user logs a recipe for today's meals:
- Select portion size in grams
- `portionRecipe()` scales all macros proportionally
- Logged with scaled nutrition values

## Storage

**Key:** `RECIPES` in AsyncStorage

**Format:**
```json
{
  "recipes": [
    {
      "id": "uuid",
      "name": "Chicken Meal Prep",
      "ingredients": [...],
      "totalWeightInGrams": 1000,
      "createdAt": 1234567890,
      "updatedAt": 1234567890
    }
  ]
}
```

## Performance Optimizations

- All components wrapped with `React.memo()` to prevent unnecessary re-renders
- Ingredients list uses efficient mapping with unique keys
- Modal transitions optimized with Keyboard.dismiss()
- AsyncStorage operations batched in `useRecipes` hook

## Future Enhancements

1. **Recipe Templates** - Share/import popular recipes
2. **Meal Planning** - Schedule recipes for upcoming days
3. **Recipe Scaling** - Quick buttons for common portions (250g, 500g, 1kg)
4. **Nutrition Goals** - Show recipe macros against daily goals
5. **Favorites** - Mark frequently used recipes as favorites
6. **Search** - Filter recipes by name or ingredients
7. **Export** - Share recipes as text or JSON
8. **Batch Logging** - Log entire recipe with one tap

## Testing Checklist

- [ ] Create new recipe with name
- [ ] Add ingredient via barcode scan
- [ ] Add ingredient via manual entry
- [ ] Add ingredient from saved foods
- [ ] Edit recipe name
- [ ] Delete ingredient from recipe
- [ ] Delete entire recipe
- [ ] Verify nutrition calculations are correct
- [ ] Test recipe portioning (e.g., 600g of 1000g recipe)
- [ ] Verify recipes persist after app restart
- [ ] Test on both light and dark themes
