import { isToday } from '@/utils/date';
import { STORAGE_KEYS } from '@/utils/storage';
import { useCallback, useMemo } from 'react';
import { useHistoryManager, usePersistedState } from './use-persisted-state';

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: number;
  mealType?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  isFavorite?: boolean;
}

export interface WaterLog {
  date: string;
  amount: number;
}

export function useFoodManager() {
  const foodManager = useHistoryManager<FoodEntry>(STORAGE_KEYS.FOOD_ENTRIES);
  const [favorites, setFavorites] = usePersistedState<FoodEntry[]>(STORAGE_KEYS.FOOD_FAVORITES, []);
  const [waterLog, setWaterLog] = usePersistedState<WaterLog>(
    STORAGE_KEYS.WATER_TODAY,
    { date: new Date().toDateString(), amount: 0 }
  );

  // Filter to today's entries
  const todayEntries = useMemo(() => {
    return foodManager.history.filter(entry => isToday(entry.timestamp));
  }, [foodManager.history]);

  // Calculate totals
  const totals = useMemo(() => {
    return todayEntries.reduce(
      (acc, entry) => ({
        calories: acc.calories + entry.calories,
        protein: acc.protein + entry.protein,
        carbs: acc.carbs + entry.carbs,
        fat: acc.fat + entry.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [todayEntries]);

  // Get current water amount (reset if new day)
  const water = useMemo(() => {
    const today = new Date().toDateString();
    if (waterLog.date !== today) {
      setWaterLog({ date: today, amount: 0 });
      return 0;
    }
    return waterLog.amount;
  }, [waterLog]);

  const addEntry = useCallback(
    async (entry: FoodEntry) => {
      await foodManager.add(entry);
    },
    [foodManager]
  );

  const removeEntry = useCallback(
    async (id: string) => {
      const entry = foodManager.history.find(e => e.id === id);
      if (entry) {
        await foodManager.remove(entry.timestamp);
      }
    },
    [foodManager]
  );

  const clearToday = useCallback(async () => {
    const entriesToKeep = foodManager.history.filter(entry => !isToday(entry.timestamp));
    // This is a bit hacky but works with our current API
    for (const entry of todayEntries) {
      await foodManager.remove(entry.timestamp);
    }
  }, [foodManager, todayEntries]);

  const addWater = useCallback(
    async (amount: number) => {
      const today = new Date().toDateString();
      const newAmount = (waterLog.date === today ? waterLog.amount : 0) + amount;
      await setWaterLog({ date: today, amount: newAmount });
    },
    [waterLog, setWaterLog]
  );

  const toggleFavorite = useCallback(
    async (item: FoodEntry) => {
      const isFav = favorites.some(f => f.name === item.name && f.calories === item.calories);

      if (isFav) {
        const updated = favorites.filter(f => !(f.name === item.name && f.calories === item.calories));
        await setFavorites(updated);
      } else {
        const updated = [...favorites, {
          ...item,
          id: `fav_${Date.now()}`,
          timestamp: Date.now(),
          isFavorite: true,
        }];
        await setFavorites(updated);
      }
    },
    [favorites, setFavorites]
  );

  const addFavoriteToday = useCallback(
    async (favorite: FoodEntry) => {
      const newEntry: FoodEntry = {
        ...favorite,
        id: `entry_${Date.now()}`,
        timestamp: Date.now(),
      };
      await addEntry(newEntry);
    },
    [addEntry]
  );

  const isFavorite = useCallback(
    (item: FoodEntry) => {
      return favorites.some(f => f.name === item.name && f.calories === item.calories);
    },
    [favorites]
  );

  return {
    entries: todayEntries,
    allEntries: foodManager.history,
    favorites,
    totals,
    water,
    addEntry,
    removeEntry,
    clearToday,
    addWater,
    toggleFavorite,
    addFavoriteToday,
    isFavorite,
  };
}
