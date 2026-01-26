import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Icon } from './Icon';


import { StyleProp } from 'react-native';
interface IconTextProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: ViewStyle;
  children: React.ReactNode;
}

  const theme = useColorScheme() ?? 'light';
  const defaultColor = color ?? (theme === 'dark' ? '#fff' : '#111');

  return (
    <View style={[styles.row, containerStyle]}>
      <Icon name={name} size={size} color={defaultColor} />
      <Text style={[styles.text, { color: defaultColor }].concat(style ? (Array.isArray(style) ? style : [style]) : [])}>{children}</Text>
    </View>
  );
}

  const theme = useColorScheme() ?? 'light';
  const defaultColor = color ?? (theme === 'dark' ? '#fff' : '#111');

  return (
    <View style={[styles.row, containerStyle]}>
      <Icon name={name} size={size} color={defaultColor} />
      <Text style={[styles.text, { color: defaultColor }, style && !Array.isArray(style) ? style : undefined]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 16, marginLeft: 6 },
});
