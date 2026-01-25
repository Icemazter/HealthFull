import { Palette } from '@/constants/theme';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HevyApiKeyModalProps {
  visible: boolean;
  onApiKeySubmit: (apiKey: string) => Promise<boolean>;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export const HevyApiKeyModal = React.memo(function HevyApiKeyModal({
  visible,
  onApiKeySubmit,
  onCancel,
  isLoading = false,
  error = null,
}: HevyApiKeyModalProps) {
  const insets = useSafeAreaInsets();
  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!apiKey.trim()) {
      return;
    }

    setIsSubmitting(true);
    const success = await onApiKeySubmit(apiKey.trim());
    setIsSubmitting(false);

    if (success) {
      setApiKey('');
      onCancel();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} hitSlop={10}>
            <Text style={styles.cancelButton}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Connect Hevy</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.title}>Hevy Workout Integration</Text>
            <Text style={styles.description}>
              Connect your Hevy Pro account to automatically sync your workouts to HealthFull.
            </Text>
          </View>

          <View style={styles.stepsSection}>
            <Text style={styles.stepsTitle}>Steps:</Text>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>
                Go to{' '}
                <Text style={styles.link}>https://hevy.com/settings?developer</Text>
              </Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                Copy your API Key (you need Hevy Pro)
              </Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>
                Paste it below to enable sync
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>API Key</Text>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Paste your Hevy API key here"
              placeholderTextColor={Palette.gray}
              secureTextEntry
              editable={!isSubmitting && !isLoading}
            />
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </View>

          <View style={styles.buttonGroup}>
            <Pressable
              style={[
                styles.submitButton,
                (isSubmitting || isLoading) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || isLoading || !apiKey.trim()}
              hitSlop={10}
            >
              {isSubmitting || isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Connect</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>What will be synced?</Text>
            <Text style={styles.infoText}>• Your Hevy workouts</Text>
            <Text style={styles.infoText}>• Exercise names, sets, reps, and weights</Text>
            <Text style={styles.infoText}>• Workout timestamps and notes</Text>
            <Text style={styles.infoText}>• Auto-syncs every hour when app is active</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.lightGray2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Palette.darkGray,
  },
  cancelButton: {
    fontSize: 24,
    color: Palette.gray,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.darkGray,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Palette.gray,
    lineHeight: 20,
  },
  stepsSection: {
    marginBottom: 24,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 12,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.primary,
    marginRight: 12,
    minWidth: 24,
  },
  stepText: {
    fontSize: 14,
    color: Palette.darkGray,
    flex: 1,
    lineHeight: 20,
  },
  link: {
    color: Palette.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Palette.lightGray2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: Palette.darkGray,
    fontFamily: 'monospace',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  buttonGroup: {
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: Palette.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: Palette.primary,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.darkGray,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: Palette.darkGray,
    lineHeight: 18,
    marginBottom: 4,
  },
});
