import { Palette } from '@/constants/theme';
import { ParsedFoodEntry, parseNaturalLanguageFood } from '@/utils/openai';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

interface NaturalLanguageLoggerProps {
  visible: boolean;
  isDark: boolean;
  apiKey: string;
  onAdd: (entries: ParsedFoodEntry[]) => void;
  onCancel: () => void;
}

export function NaturalLanguageLogger({
  visible,
  isDark,
  apiKey,
  onAdd,
  onCancel,
}: NaturalLanguageLoggerProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedFoodEntry[]>([]);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'input' | 'confirm'>('input');

  const reset = () => {
    setText('');
    setLoading(false);
    setParsed([]);
    setError('');
    setStep('input');
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const handleParse = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!apiKey) {
      setError('No OpenAI API key found. Add your key in Goals → AI Settings.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await parseNaturalLanguageFood(trimmed, apiKey);
      if (result.length === 0) {
        setError('No food items detected. Try being more specific.');
      } else {
        setParsed(result);
        setStep('confirm');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to parse. Check your API key and internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    onAdd(parsed);
    reset();
  };

  const bg = isDark ? '#1e293b' : '#fff';
  const textColor = isDark ? '#f1f5f9' : '#111';
  const subColor = isDark ? '#94a3b8' : '#666';
  const inputBg = isDark ? '#0f172a' : '#f3f4f6';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { backgroundColor: bg }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>🤖 AI Food Logger</Text>
            <Pressable onPress={handleCancel} hitSlop={8}>
              <Text style={[styles.cancelBtn, { color: subColor }]}>✕</Text>
            </Pressable>
          </View>

          {step === 'input' ? (
            <>
              <Text style={[styles.label, { color: subColor }]}>
                Describe what you ate in plain English:
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
                value={text}
                onChangeText={setText}
                placeholder="e.g. two scrambled eggs, a slice of sourdough toast with butter and a black coffee"
                placeholderTextColor={subColor}
                multiline
                numberOfLines={4}
                editable={!loading}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Pressable
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleParse}
                disabled={loading || !text.trim()}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Parse Food 🔍</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: subColor }]}>
                Found {parsed.length} item{parsed.length !== 1 ? 's' : ''}. Review and confirm:
              </Text>
              <ScrollView style={styles.resultsList}>
                {parsed.map((item, i) => (
                  <View key={i} style={[styles.resultItem, { backgroundColor: inputBg }]}>
                    <Text style={[styles.resultName, { color: textColor }]}>{item.name}</Text>
                    <Text style={[styles.resultMacros, { color: subColor }]}>
                      {Math.round(item.calories)} cal · P:{Math.round(item.protein)}g · C:{Math.round(item.carbs)}g · F:{Math.round(item.fat)}g
                    </Text>
                    <Text style={[styles.resultMeal, { color: Palette.primary }]}>
                      {item.mealType}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.row}>
                <Pressable
                  style={[styles.btn, styles.btnSecondary]}
                  onPress={() => setStep('input')}>
                  <Text style={[styles.btnText, { color: Palette.primary }]}>← Edit</Text>
                </Pressable>
                <Pressable style={styles.btn} onPress={handleConfirm}>
                  <Text style={styles.btnText}>Add All ✓</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
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
  input: {
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 14,
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
    opacity: 0.5,
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
  resultsList: {
    maxHeight: 320,
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
    marginBottom: 2,
  },
  resultMeal: {
    fontSize: 11,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
  },
});
