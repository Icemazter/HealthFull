import { Palette } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

interface LabeledInputProps extends TextInputProps {
  label: string;
  isDark?: boolean;
  unit?: string;
}

export function LabeledInput({ label, isDark, unit, style, ...props }: LabeledInputProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, isDark && styles.inputDark, style]}
          placeholderTextColor={isDark ? '#666' : '#999'}
          {...props}
        />
        {unit && <Text style={[styles.unit, isDark && styles.unitDark]}>{unit}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 8,
  },
  labelDark: {
    color: '#d1d5db',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Palette.lightGray2,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  inputDark: {
    backgroundColor: '#262626',
    borderColor: '#404040',
    color: '#e5e5e5',
  },
  unit: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.darkGray,
  },
  unitDark: {
    color: '#d1d5db',
  },
});
