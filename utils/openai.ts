/**
 * OpenAI API client for AI-powered features:
 * - Natural language food logging
 * - Photo-based food analysis
 * - Remaining macros meal suggestion
 */

export interface ParsedFoodEntry {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  mealType?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const FOOD_SYSTEM_PROMPT = `You are a precise nutrition expert. When given a description of food consumed, extract each distinct food item and return a JSON array.

Each item must have these exact fields:
- name: string (concise food name)
- calories: number (kcal, realistic estimate)
- protein: number (grams)
- carbs: number (grams, total carbohydrates)
- fat: number (grams)
- fiber: number (grams)
- mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack" (infer from context or default to "Snack")

Respond ONLY with a valid JSON array, no markdown, no explanation.
Example: [{"name":"2 scrambled eggs","calories":182,"protein":12,"carbs":2,"fat":14,"fiber":0,"mealType":"Breakfast"}]`;

const PHOTO_SYSTEM_PROMPT = `You are a precise nutrition expert. Analyze the food in this image and identify all visible food items. Return a JSON array of each distinct food item.

Each item must have these exact fields:
- name: string (concise food name with estimated portion, e.g. "Grilled chicken breast ~150g")
- calories: number (kcal, realistic estimate)
- protein: number (grams)
- carbs: number (grams, total carbohydrates)
- fat: number (grams)
- fiber: number (grams)
- mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack" (infer from context or default to "Snack")

Respond ONLY with a valid JSON array, no markdown, no explanation.`;

const MACRO_SUGGESTION_PROMPT = `You are a nutrition expert. Given remaining macro targets for the day, suggest a single realistic meal or snack that closely fits those targets.

Return a JSON object with:
- suggestion: string (human-friendly description, e.g. "Greek yogurt with almonds and berries")
- explanation: string (1 sentence why it fits)
- items: array of food entries, each with: name, calories, protein, carbs, fat, fiber, mealType

The combined macros of all items should stay within 10% of the targets.
Respond ONLY with valid JSON, no markdown.`;

async function callOpenAI(
  apiKey: string,
  messages: Array<{ role: string; content: any }>,
  model = 'gpt-4o-mini'
): Promise<string> {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const msg = (error as any)?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function parseJsonResponse<T>(raw: string): T {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned) as T;
}

/**
 * Parse a natural language food description into structured entries.
 * Example: "I had two scrambled eggs and a slice of toast with butter"
 */
export async function parseNaturalLanguageFood(
  text: string,
  apiKey: string
): Promise<ParsedFoodEntry[]> {
  const content = await callOpenAI(apiKey, [
    { role: 'system', content: FOOD_SYSTEM_PROMPT },
    { role: 'user', content: text },
  ]);
  const parsed = parseJsonResponse<ParsedFoodEntry[]>(content);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Analyze a food photo (base64 JPEG/PNG) and return estimated nutrition.
 */
export async function analyzePhotoFood(
  base64Image: string,
  mimeType: string,
  apiKey: string
): Promise<ParsedFoodEntry[]> {
  const content = await callOpenAI(
    apiKey,
    [
      { role: 'system', content: PHOTO_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: 'Please identify all food items and their estimated nutritional values.',
          },
        ],
      },
    ],
    'gpt-4o'
  );
  const parsed = parseJsonResponse<ParsedFoodEntry[]>(content);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Suggest a meal/snack that fits the remaining macro budget.
 */
export async function suggestMealForMacros(
  remaining: { calories: number; protein: number; carbs: number; fat: number; fiber: number },
  apiKey: string
): Promise<{ suggestion: string; explanation: string; items: ParsedFoodEntry[] }> {
  const prompt = `Remaining macro targets:
- Calories: ${Math.round(remaining.calories)} kcal
- Protein: ${Math.round(remaining.protein)}g
- Carbs: ${Math.round(remaining.carbs)}g
- Fat: ${Math.round(remaining.fat)}g
- Fiber: ${Math.round(remaining.fiber)}g

Suggest a snack or small meal that fits these targets.`;

  const content = await callOpenAI(apiKey, [
    { role: 'system', content: MACRO_SUGGESTION_PROMPT },
    { role: 'user', content: prompt },
  ]);

  const parsed = parseJsonResponse<{
    suggestion: string;
    explanation: string;
    items: ParsedFoodEntry[];
  }>(content);

  return {
    suggestion: parsed.suggestion ?? 'No suggestion',
    explanation: parsed.explanation ?? '',
    items: Array.isArray(parsed.items) ? parsed.items : [],
  };
}
