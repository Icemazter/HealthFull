import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async get<T>(key: string, defaultValue?: T): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue ?? null;
    } catch (error) {
      console.error(`Failed to load ${key}:`, error);
      return defaultValue ?? null;
    }
  },

  async set<T>(key: string, value: T): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
      return false;
    }
  },

  async remove(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
      return false;
    }
  },

  async multiGet<T extends Record<string, any>>(keys: string[]): Promise<Partial<T>> {
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      return pairs.reduce((acc, [key, value]) => {
        if (value) {
          acc[key as keyof T] = JSON.parse(value);
        }
        return acc;
      }, {} as Partial<T>);
    } catch (error) {
      console.error('Failed to load multiple keys:', error);
      return {};
    }
  },

  async multiSet(items: Record<string, any>): Promise<boolean> {
    try {
      const pairs = Object.entries(items).map(([key, value]) => [
        key,
        JSON.stringify(value),
      ] as [string, string]);
      await AsyncStorage.multiSet(pairs);
      return true;
    } catch (error) {
      console.error('Failed to save multiple keys:', error);
      return false;
    }
  },
};

export const STORAGE_KEYS = {
  MACRO_GOALS: 'macro_goals',
  BODY_STATS: 'body_stats',
  WEIGHT_HISTORY: 'weight_history',
  FOOD_ENTRIES: 'food_entries',
  FOOD_FAVORITES: 'food_favorites',
  GLUCOSE_HISTORY: 'glucose_history',
  INSULIN_HISTORY: 'insulin_history',
  DIABETES_MODE: 'diabetes_mode',
  DARK_MODE: 'dark_mode_preference',
  WATER_TODAY: 'water_today',
  WORKOUT_HISTORY: 'workout_history',
} as const;
