import { Palette } from '@/constants/theme';
import { ParsedFoodEntry, suggestMealForMacros } from '@/utils/openai';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface MacroSuggestionProps {
  visible: boolean;
  isDark: boolean;
  apiKey: string;
  remaining: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
  onAdd: (entries: ParsedFoodEntry[]) => void;
  onCancel: () => void;
}

export function MacroSuggestion({
  visible,
  isDark,
  apiKey,
  remaining,
  onAdd,
  onCancel,
}: MacroSuggestionProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    suggestion: string;
    explanation: string;
    items: ParsedFoodEntry[];
  } | null>(null);
  const [error, setError] = useState('');

  const bg = isDark ? '#1e293b' : '#fff';
  const textColor = isDark ? '#f1f5f9' : '#111';
  const subColor = isDark ? '#94a3b8' : '#666';
  const inputBg = isDark ? '#0f172a' : '#f3f4f6';

  const handleGenerate = async () => {
    if (!apiKey) {
      setError('No OpenAI API key found. Add your key in Goals → AI Settings.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await suggestMealForMacros(remaining, apiKey);
      setResult(r);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to generate suggestion.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (result?.items) {
      onAdd(result.items);
    }
    handleClose();
  };

  const handleClose = () => {
    setResult(null);
    setError('');
    onCancel();
  };

  const allPositive =
    remaining.calories > 10 || remaining.protein > 2 || remaining.carbs > 2 || remaining.fat > 2;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: bg }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>🧠 Smart Macro Filler</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Text style={[styles.cancelBtn, { color: subColor }]}>✕</Text>
            </Pressable>
          </View>

          {/* Remaining macros summary */}
          <View style={[styles.remainingCard, { backgroundColor: inputBg }]}>
            <Text style={[styles.remainingTitle, { color: textColor }]}>Remaining Today</Text>
            <View style={styles.macroRow}>
              {[
                { label: 'Cal', value: Math.max(0, Math.round(remaining.calories)) },
                { label: 'Protein', value: `${Math.max(0, Math.round(remaining.protein))}g` },
                { label: 'Carbs', value: `${Math.max(0, Math.round(remaining.carbs))}g` },
                { label: 'Fat', value: `${Math.max(0, Math.round(remaining.fat))}g` },
              ].map((m) => (
                <View key={m.label} style={styles.macroBox}>
                  <Text style={[styles.macroValue, { color: Palette.primary }]}>{m.value}</Text>
                  <Text style={[styles.macroLabel, { color: subColor }]}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {!allPositive && (
            <Text style={[styles.label, { color: subColor }]}>
              🎉 You've already hit your macro goals for today!
            </Text>
          )}

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Palette.primary} />
              <Text style={[styles.loadingText, { color: textColor }]}>
                Finding the perfect snack…
              </Text>
            </View>
          ) : result ? (
            <>
              <View style={[styles.suggestionBanner, { backgroundColor: '#dcfce7' }]}>
                <Text style={styles.suggestionText}>💡 {result.suggestion}</Text>
                <Text style={styles.suggestionExplanation}>{result.explanation}</Text>
              </View>
              <ScrollView style={styles.resultsList}>
                {result.items.map((item, i) => (
                  <View key={i} style={[styles.resultItem, { backgroundColor: inputBg }]}>
                    <Text style={[styles.resultName, { color: textColor }]}>{item.name}</Text>
                    <Text style={[styles.resultMacros, { color: subColor }]}>
                      {Math.round(item.calories)} cal · P:{Math.round(item.protein)}g · C:{Math.round(item.carbs)}g · F:{Math.round(item.fat)}g
                    </Text>
                  </View>
                ))}
              </ScrollView>
              {!!error && <Text style={styles.error}>{error}</Text>}
              <View style={styles.row}>
                <Pressable
                  style={[styles.btn, styles.btnSecondary]}
                  onPress={handleGenerate}>
                  <Text style={[styles.btnText, { color: Palette.primary }]}>Try Again</Text>
                </Pressable>
                <Pressable style={styles.btn} onPress={handleConfirm}>
                  <Text style={styles.btnText}>Log It ✓</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Pressable
                style={[styles.btn, !allPositive && styles.btnDisabled]}
                onPress={handleGenerate}
                disabled={!allPositive}>
                <Text style={styles.btnText}>Suggest a Snack ✨</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  cancelBtn: {
    fontSize: 18,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    marginBottom: 10,
  },
  remainingCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  remainingTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroBox: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  macroLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  suggestionBanner: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  suggestionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  suggestionExplanation: {
    fontSize: 13,
    color: '#15803d',
  },
  resultsList: {
    maxHeight: 240,
    marginBottom: 12,
  },
  resultItem: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultMacros: {
    fontSize: 12,
  },
  error: {
    color: Palette.error,
    fontSize: 13,
    marginBottom: 10,
  },
  btn: {
    flex: 1,
    backgroundColor: Palette.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Palette.primary,
    marginRight: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
  },
});
