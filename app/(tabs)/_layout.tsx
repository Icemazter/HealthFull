import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StatusBar, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const systemColorScheme = useColorScheme();
  const colorScheme = systemColorScheme ?? 'light';
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isLargeDevice = width > 768;

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme].tint,
          tabBarInactiveTintColor: isDark ? '#6b7280' : '#9ca3af',
          tabBarActiveBackgroundColor: isDark ? '#111827' : '#f3f4f6',
          tabBarItemStyle: {
            marginHorizontal: 6,
            paddingVertical: Platform.OS === 'web' ? 10 : 12,
            paddingHorizontal: 10,
            borderRadius: 14,
          },
          tabBarLabelStyle: isLargeDevice ? {
            fontSize: 15,
            fontWeight: '700',
            letterSpacing: 0.2,
          } : {
            fontSize: 0,
            height: 0,
          },
          tabBarStyle: {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            borderTopColor: isDark ? '#1e293b' : '#e5e7eb',
            borderTopWidth: 1,
            paddingBottom: Platform.OS === 'web' ? 10 : Math.max(insets.bottom, 12),
            paddingTop: 12,
            height: Platform.OS === 'web' ? 78 : Math.max(insets.bottom + 64, 78),
          },
          headerShown: false,
          tabBarButton: HapticTab,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Nutrition',
            tabBarLabel: isLargeDevice ? 'Nutrition' : '',
            tabBarIcon: ({ color }) => <IconSymbol size={30} name="fork.knife" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Exercise',
            tabBarLabel: isLargeDevice ? 'Exercise' : '',
            tabBarIcon: ({ color }) => <IconSymbol size={30} name="figure.run" color={color} />,
          }}
        />
        <Tabs.Screen
          name="goals"
          options={{
            title: 'Goals',
            tabBarLabel: isLargeDevice ? 'Goals' : '',
            tabBarIcon: ({ color }) => <IconSymbol size={30} name="target" color={color} />,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progress',
            tabBarLabel: isLargeDevice ? 'Progress' : '',
            tabBarIcon: ({ color }) => <IconSymbol size={30} name="chart.line.uptrend.xyaxis" color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}
