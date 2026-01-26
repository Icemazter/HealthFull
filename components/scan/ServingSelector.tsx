import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Palette } from '../../constants/theme';

export type VolumeUnit = 'ml' | 'dl' | 'tbsp' | 'tsp';

export const VOLUME_UNITS: { key: VolumeUnit; label: string; mlFactor: number }[] = [
  { key: 'ml', label: 'ml', mlFactor: 1 },
  { key: 'dl', label: 'dl', mlFactor: 100 },
  { key: 'tbsp', label: 'tbsp', mlFactor: 15 },
  { key: 'tsp', label: 'tsp', mlFactor: 5 },
];

interface ServingSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  unitType: 'g' | 'ml';
  selectedVolumeUnit: VolumeUnit;
  onVolumeUnitChange: (unit: VolumeUnit) => void;
}

export const ServingSelector = React.memo(function ServingSelector({
  value,
  onValueChange,
  unitType,
  selectedVolumeUnit,
  onVolumeUnitChange,
}: ServingSelectorProps) {
  return (
    <View style={styles.servingSizeContainer}>
      <Text style={styles.sectionLabel}>Serving Size</Text>
      <View style={styles.quantityRow}>
        <View style={styles.quantityInputWrapper}>
          <TextInput
            style={styles.quantityInput}
            value={value}
            onChangeText={onValueChange}
            keyboardType="numeric"
            placeholder="100"
            placeholderTextColor={Palette.gray}
            selectTextOnFocus
          />
        </View>
        {unitType === 'g' ? (
          <Text style={styles.unitLabel}>grams</Text>
        ) : (
          <View style={styles.unitSelector}>
            {VOLUME_UNITS.map((unit) => (
              <Pressable
                key={unit.key}
                style={[
                  styles.unitButton,
                  selectedVolumeUnit === unit.key && styles.unitButtonActive,
                ]}
                onPress={() => onVolumeUnitChange(unit.key)}>
                <Text
                  style={[
                    styles.unitButtonText,
                    selectedVolumeUnit === unit.key && styles.unitButtonTextActive,
                  ]}>
                  {unit.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  servingSizeContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    color: Palette.darkGray,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
  },
  quantityInputWrapper: {
    flex: 1,
    maxWidth: 100,
  },
  quantityInput: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: Palette.darkGray,
    textAlign: 'center',
  },
  unitLabel: {
    color: Palette.gray,
    fontSize: 14,
    fontWeight: '500',
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
    paddingRight: 4,
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Palette.lightGray2,
  },
  unitButtonActive: {
    backgroundColor: Palette.primary,
  },
  unitButtonText: {
    color: Palette.gray,
    fontSize: 13,
    fontWeight: '600',
  },
  unitButtonTextActive: {
    color: '#fff',
  },
});
