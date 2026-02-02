import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Icon } from './Icon';

interface IconTextProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: ViewStyle;
  children: React.ReactNode;
}

export function IconText({ name, size = 20, color, style, containerStyle, children }: IconTextProps) {
  const theme = useColorScheme() ?? 'light';
  const defaultColor = color ?? (theme === 'dark' ? '#fff' : '#111');

  return (
    <View style={[styles.row, containerStyle]}>
      <Icon name={name} size={size} color={defaultColor} />
      <Text style={[styles.text, { color: defaultColor }, style]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 16, marginLeft: 6 },
});
