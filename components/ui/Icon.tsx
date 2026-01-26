import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { TextStyle } from 'react-native';



interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: TextStyle;
}

export function Icon({ name, size = 18, color = '#000', style }: IconProps) {
  return <MaterialCommunityIcons name={name as any} size={size} color={color} style={style} />;
}
