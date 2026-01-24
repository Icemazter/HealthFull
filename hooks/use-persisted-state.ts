import { storage } from '@/utils/storage';
import { useCallback, useEffect, useState } from 'react';

export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => Promise<void>] {
  const [state, setState] = useState<T>(defaultValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadState = async () => {
      const stored = await storage.get<T>(key);
      if (stored !== null) {
        setState(stored);
      }
      setLoaded(true);
    };
    loadState();
  }, [key]);

  const setPersistedState = useCallback(
    async (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
        storage.set(key, newValue);
        return newValue;
      });
    },
    [key]
  );

  return [state, setPersistedState];
}

export function useHistoryManager<T extends { timestamp: number }>(storageKey: string) {
  const [history, setHistory] = usePersistedState<T[]>(storageKey, []);

  const add = useCallback(
    async (entry: T) => {
      await setHistory((prev) => [entry, ...prev]);
    },
    [setHistory]
  );

  const remove = useCallback(
    async (timestamp: number) => {
      await setHistory((prev) => prev.filter((e) => e.timestamp !== timestamp));
    },
    [setHistory]
  );

  const clear = useCallback(async () => {
    await setHistory([]);
  }, [setHistory]);

  return { history, add, remove, clear };
}
