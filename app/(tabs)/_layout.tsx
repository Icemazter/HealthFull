import { Tabs } from 'expo-router';
import React from 'react';
import { StatusBar } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const systemColorScheme = useColorScheme();
  const colorScheme = systemColorScheme ?? 'light';
  const isDark = colorScheme === 'dark';

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme].tint,
          tabBarInactiveTintColor: isDark ? '#6b7280' : '#9ca3af',
          tabBarStyle: {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            borderTopColor: isDark ? '#1e293b' : '#e5e7eb',
            borderTopWidth: 1,
            paddingBottom: 4,
          },
          headerShown: false,
          tabBarButton: HapticTab,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Nutrition',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="fork.knife" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Exercise',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="figure.run" color={color} />,
          }}
        />
        <Tabs.Screen
          name="goals"
          options={{
            title: 'Goals',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="target" color={color} />,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progress',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.line.uptrend.xyaxis" color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}
