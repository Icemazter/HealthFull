import { Palette } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface HistoryCardProps {
  isDark?: boolean;
  onDelete?: () => void;
  children: React.ReactNode;
}

export function HistoryCard({ isDark, onDelete, children }: HistoryCardProps) {
  return (
    <View style={[styles.card, isDark && styles.cardDark]}>
      <View style={styles.content}>{children}</View>
      {onDelete && (
        <Pressable onPress={onDelete} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  cardDark: {
    backgroundColor: '#262626',
    borderColor: '#404040',
  },
  content: {
    flex: 1,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    color: Palette.error,
    fontSize: 20,
    fontWeight: 'bold',
  },
});
