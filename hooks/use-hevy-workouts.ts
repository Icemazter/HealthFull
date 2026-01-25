import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { HevyWorkout, hevyService } from '@/utils/hevy';
import { storage, STORAGE_KEYS } from '@/utils/storage';

export interface HevyWorkoutSession {
  id: string;
  startTime: number;
  endTime?: number;
  exercises: Array<{
    name: string;
    sets: Array<{
      reps: number;
      weight: number;
      weightUnit: string;
    }>;
  }>;
  notes?: string;
  sourceApp: 'hevy';
}

const HEVY_WORKOUTS_KEY = 'hevy_workouts';
const HEVY_LAST_SYNC_KEY = 'hevy_last_sync';
const SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour

export const useHevyWorkouts = () => {
  const [workouts, setWorkouts] = useState<HevyWorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeySet, setApiKeySet] = useState(false);
  const appState = useRef(AppState.currentState);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize: load API key from storage and stored workouts
  useEffect(() => {
    const initializeHevy = async () => {
      try {
        const apiKey = await storage.get<string>(STORAGE_KEYS.HEVY_API_KEY, null);
        
        if (apiKey) {
          hevyService.setApiKey(apiKey);
          setApiKeySet(true);
          
          // Load cached workouts
          const cachedWorkouts = await storage.get<HevyWorkoutSession[]>(
            HEVY_WORKOUTS_KEY,
            []
          );
          setWorkouts(cachedWorkouts);
          
          // Sync on app launch
          await syncWorkouts();
        }
      } catch (err) {
        console.error('Failed to initialize Hevy:', err);
        setError('Failed to initialize Hevy integration');
      }
    };

    initializeHevy();
  }, []);

  // Setup periodic sync and app state listener
  useEffect(() => {
    if (!apiKeySet) return;

    // Set up hourly sync
    syncIntervalRef.current = setInterval(async () => {
      await syncWorkouts();
    }, SYNC_INTERVAL);

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      subscription.remove();
    };
  }, [apiKeySet]);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    // Sync when app comes to foreground
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      await syncWorkouts();
    }
    appState.current = nextAppState;
  };

  const syncWorkouts = useCallback(async () => {
    if (!apiKeySet) return;

    try {
      setIsLoading(true);
      setError(null);

      const lastSync = await storage.get<number>(HEVY_LAST_SYNC_KEY, 0);
      
      let hevyWorkouts: HevyWorkout[];
      
      if (lastSync > 0) {
        // Only fetch new workouts since last sync
        hevyWorkouts = await hevyService.getWorkoutsSince(lastSync);
      } else {
        // First sync: get all workouts
        hevyWorkouts = await hevyService.getWorkouts(100);
      }

      // Convert Hevy workouts to our format
      const converted: HevyWorkoutSession[] = hevyWorkouts.map((w) => ({
        id: w.id,
        startTime: new Date(w.startTime).getTime(),
        endTime: w.endTime ? new Date(w.endTime).getTime() : undefined,
        exercises: w.exercises.map((e) => ({
          name: e.name,
          sets: e.sets.map((s) => ({
            reps: s.reps,
            weight: s.weight,
            weightUnit: s.weightUnit,
          })),
        })),
        notes: w.notes,
        sourceApp: 'hevy' as const,
      }));

      // Merge with existing workouts (avoid duplicates)
      setWorkouts((prev) => {
        const existingIds = new Set(prev.map((w) => w.id));
        const newWorkouts = converted.filter((w) => !existingIds.has(w.id));
        return [...prev, ...newWorkouts].sort(
          (a, b) => b.startTime - a.startTime
        );
      });

      // Save to storage
      const allWorkouts = [...workouts, ...converted];
      await storage.set(HEVY_WORKOUTS_KEY, allWorkouts);
      await storage.set(HEVY_LAST_SYNC_KEY, Date.now());
    } catch (err) {
      console.error('Failed to sync Hevy workouts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error syncing workouts');
    } finally {
      setIsLoading(false);
    }
  }, [apiKeySet, workouts]);

  const setApiKey = useCallback(async (key: string) => {
    try {
      // Validate the key
      const isValid = await hevyService.validateApiKey(key);
      
      if (!isValid) {
        setError('Invalid API key. Please check and try again.');
        return false;
      }

      // Save the key
      hevyService.setApiKey(key);
      await storage.set(STORAGE_KEYS.HEVY_API_KEY, key);
      setApiKeySet(true);
      setError(null);

      // Trigger initial sync
      await syncWorkouts();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set API key';
      setError(message);
      return false;
    }
  }, [syncWorkouts]);

  const clearApiKey = useCallback(async () => {
    await storage.delete(STORAGE_KEYS.HEVY_API_KEY);
    await storage.delete(HEVY_WORKOUTS_KEY);
    await storage.delete(HEVY_LAST_SYNC_KEY);
    hevyService.setApiKey('');
    setWorkouts([]);
    setApiKeySet(false);
    setError(null);
  }, []);

  return {
    workouts,
    isLoading,
    error,
    apiKeySet,
    setApiKey,
    clearApiKey,
    syncWorkouts,
  };
};
