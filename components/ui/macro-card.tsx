import { Palette } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface MacroCardProps {
  label: string;
  value: number;
  unit: string;
  color?: string;
  isDark?: boolean;
  onPress?: () => void;
}

export function MacroCard({ label, value, unit, color = Palette.primary, isDark, onPress }: MacroCardProps) {
  const Card = onPress ? Pressable : View;

  return (
    <Card style={[styles.card, isDark && styles.cardDark]} onPress={onPress}>
      <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text>
      <Text style={[styles.value, { color }]}>{Math.round(value)}{unit}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 0,
  },
  cardDark: {
    backgroundColor: '#262626',
  },
  label: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  labelDark: {
    color: '#9ca3af',
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
