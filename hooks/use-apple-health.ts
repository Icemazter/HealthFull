import { useCallback, useEffect, useState } from 'react';
import { NativeModules, Platform } from 'react-native';

const { HealthModule } = NativeModules;

export interface HealthData {
  steps: number;
  heartRate: number;
  timestamp: number;
}

export function useAppleHealth() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  // Check if platform supports Apple Health (iOS only)
  useEffect(() => {
    const available = Platform.OS === 'ios' && !!HealthModule;
    setIsAvailable(available);
    if (!available && Platform.OS === 'ios') {
      setError('HealthKit module not available. Please install react-native-health.');
    }
  }, []);

  const requestHealthKitPermission = useCallback(async () => {
    if (!isAvailable || !HealthModule) {
      setError('Apple Health is only available on iOS with HealthKit module');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await HealthModule.requestAuthorization([
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierHeartRate',
      ]);

      setIsLoading(false);
      if (result) {
        console.log('HealthKit permission granted');
        return true;
      } else {
        setError('HealthKit permission denied');
        return false;
      }
    } catch (err) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error requesting HealthKit permission:', err);
      return false;
    }
  }, [isAvailable]);

  const fetchTodayData = useCallback(async () => {
    if (!isAvailable || !HealthModule) {
      setError('Apple Health is only available on iOS');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const now = new Date();

      // Call native module to fetch health data
      const data = await HealthModule.getHealthData(
        today.getTime(),
        now.getTime()
      );

      const healthInfo: HealthData = {
        steps: data.steps || 0,
        heartRate: data.heartRate || 0,
        timestamp: Date.now(),
      };

      setHealthData(healthInfo);
      return healthInfo;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error fetching health data:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  return {
    healthData,
    isLoading,
    error,
    isAvailable,
    requestPermission: requestHealthKitPermission,
    fetchTodayData,
  };
}
