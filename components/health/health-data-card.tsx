import { Palette } from '@/constants/theme';
import { useAppleHealth } from '@/hooks/use-apple-health';
import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

interface HealthCardProps {
  isDark?: boolean;
}

export function HealthDataCard({ isDark = false }: HealthCardProps) {
  const { healthData, isLoading, error, isAvailable, requestPermission, fetchTodayData } = useAppleHealth();

  const handleRefresh = async () => {
    if (!healthData) {
      // First time - request permission then fetch
      const granted = await requestPermission();
      if (granted) {
        await fetchTodayData();
      }
    } else {
      // Already permitted - just fetch
      await fetchTodayData();
    }
  };

  const stepGoal = 10000;
  const stepsPercent = useMemo(() => {
    if (!healthData) return 0;
    return Math.min((healthData.steps / stepGoal) * 100, 100);
  }, [healthData]);

  if (!isAvailable) {
    return (
      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.title, isDark && styles.titleDark]}>❤️ Health Data</Text>
        <Text style={[styles.infoText, isDark && styles.infoTextDark]}>
          Apple Health is only available on iOS
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, isDark && styles.cardDark]}>
      <Text style={[styles.title, isDark && styles.titleDark]}>❤️ Health Data</Text>

      {error && (
        <Text style={[styles.errorText, isDark && styles.errorTextDark]}>
          {error}
        </Text>
      )}

      {isLoading && !healthData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={isDark ? '#60a5fa' : Palette.primary}
          />
          <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
            Syncing with Apple Health...
          </Text>
        </View>
      ) : healthData ? (
        <View style={styles.dataContainer}>
          {/* Steps */}
          <View style={styles.metricRow}>
            <View style={styles.metricInfo}>
              <Text style={[styles.metricLabel, isDark && styles.metricLabelDark]}>
                Steps Today
              </Text>
              <Text style={[styles.metricValue, isDark && styles.metricValueDark]}>
                {healthData.steps.toLocaleString()}
              </Text>
              <Text style={[styles.metricGoal, isDark && styles.metricGoalDark]}>
                Goal: {stepGoal.toLocaleString()}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${stepsPercent}%`,
                    backgroundColor: stepsPercent >= 100 ? '#10b981' : Palette.primary,
                  },
                  isDark && styles.progressFillDark,
                ]}
              />
            </View>
            <Text style={[styles.percentText, isDark && styles.percentTextDark]}>
              {Math.round(stepsPercent)}%
            </Text>
          </View>

          {/* Heart Rate */}
          {healthData.heartRate > 0 && (
            <View style={[styles.heartRateBox, isDark && styles.heartRateBoxDark]}>
              <Text style={[styles.heartRateLabel, isDark && styles.heartRateLabelDark]}>
                Avg Heart Rate
              </Text>
              <Text style={[styles.heartRateValue, isDark && styles.heartRateValueDark]}>
                {healthData.heartRate} BPM
              </Text>
              <Text style={[styles.heartRateStatus, isDark && styles.heartRateStatusDark]}>
                {healthData.heartRate < 60
                  ? '😌 Resting'
                  : healthData.heartRate < 100
                    ? '🚶 Normal'
                    : '🏃 Active'}
              </Text>
            </View>
          )}

          {/* Last Synced */}
          <Text style={[styles.syncTime, isDark && styles.syncTimeDark]}>
            Last synced: {new Date(healthData.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      ) : (
        <Text style={[styles.infoText, isDark && styles.infoTextDark]}>
          Tap below to connect Apple Health
        </Text>
      )}

      {/* Refresh/Connect Button */}
      <Pressable
        style={[styles.button, isLoading && styles.buttonDisabled, isDark && styles.buttonDark]}
        onPress={handleRefresh}
        disabled={isLoading}>
        <Text style={[styles.buttonText, isDark && styles.buttonTextDark]}>
          {isLoading ? 'Syncing...' : healthData ? '🔄 Refresh' : '🔗 Connect Apple Health'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = {
  card: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  } as any,
  cardDark: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  } as any,
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Palette.primary,
    marginBottom: 16,
  } as any,
  titleDark: {
    color: '#60a5fa',
  } as any,
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  } as any,
  loadingText: {
    marginTop: 12,
    color: Palette.gray,
    fontSize: 14,
  } as any,
  loadingTextDark: {
    color: '#9ca3af',
  } as any,
  dataContainer: {
    marginBottom: 16,
  } as any,
  metricRow: {
    marginBottom: 20,
  } as any,
  metricInfo: {
    marginBottom: 8,
  } as any,
  metricLabel: {
    fontSize: 14,
    color: Palette.gray,
    marginBottom: 4,
  } as any,
  metricLabelDark: {
    color: '#9ca3af',
  } as any,
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Palette.primary,
  } as any,
  metricValueDark: {
    color: '#60a5fa',
  } as any,
  metricGoal: {
    fontSize: 12,
    color: Palette.gray,
    marginTop: 2,
  } as any,
  metricGoalDark: {
    color: '#6b7280',
  } as any,
  progressBar: {
    height: 8,
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  } as any,
  progressFill: {
    height: '100%',
    borderRadius: 4,
  } as any,
  progressFillDark: {} as any,
  percentText: {
    fontSize: 12,
    color: Palette.gray,
    textAlign: 'right',
  } as any,
  percentTextDark: {
    color: '#9ca3af',
  } as any,
  heartRateBox: {
    backgroundColor: '#ffe5e5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffcccc',
  } as any,
  heartRateBoxDark: {
    backgroundColor: '#4a1a1a',
    borderColor: '#662222',
  } as any,
  heartRateLabel: {
    fontSize: 12,
    color: '#d97706',
    marginBottom: 4,
  } as any,
  heartRateLabelDark: {
    color: '#f87171',
  } as any,
  heartRateValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626',
  } as any,
  heartRateValueDark: {
    color: '#ff6b6b',
  } as any,
  heartRateStatus: {
    fontSize: 13,
    color: '#d97706',
    marginTop: 4,
  } as any,
  heartRateStatusDark: {
    color: '#fbbf24',
  } as any,
  syncTime: {
    fontSize: 11,
    color: Palette.gray,
    marginBottom: 12,
    textAlign: 'center',
  } as any,
  syncTimeDark: {
    color: '#6b7280',
  } as any,
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    marginBottom: 12,
    textAlign: 'center',
  } as any,
  errorTextDark: {
    color: '#ff6b6b',
  } as any,
  infoText: {
    fontSize: 14,
    color: Palette.gray,
    marginBottom: 12,
    textAlign: 'center',
  } as any,
  infoTextDark: {
    color: '#9ca3af',
  } as any,
  button: {
    backgroundColor: Palette.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  } as any,
  buttonDark: {
    backgroundColor: '#3b82f6',
  } as any,
  buttonDisabled: {
    opacity: 0.6,
  } as any,
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  } as any,
  buttonTextDark: {
    color: '#fff',
  } as any,
};
