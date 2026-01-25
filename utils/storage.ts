import AsyncStorage from '@react-native-async-storage/async-storage';

type StorageListener = (value: any) => void;
const storageListeners: Record<string, Set<StorageListener>> = {};

const emitStorage = (key: string, value: any) => {
  const listeners = storageListeners[key];
  if (!listeners) return;
  listeners.forEach((listener) => listener(value));
};

export const storageEvents = {
  subscribe: (key: string, listener: StorageListener) => {
    if (!storageListeners[key]) storageListeners[key] = new Set();
    storageListeners[key]!.add(listener);
    return () => {
      storageListeners[key]?.delete(listener);
    };
  },
};

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
      emitStorage(key, value);
      return true;
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
      return false;
    }
  },

  async remove(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      emitStorage(key, null);
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
      for (const [key, value] of Object.entries(items)) {
        emitStorage(key, value);
      }
      return true;
    } catch (error) {
      console.error('Failed to save multiple keys:', error);
      return false;
    }
  },

  async multiRemove(keys: string[]): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove(keys);
      for (const key of keys) {
        emitStorage(key, null);
      }
      return true;
    } catch (error) {
      console.error('Failed to remove multiple keys:', error);
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
  RECIPES: 'recipes',
} as const;
