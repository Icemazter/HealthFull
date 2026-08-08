import { Palette } from '@/constants/theme';
import { ParsedFoodEntry, analyzePhotoFood } from '@/utils/openai';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface PhotoAnalyzerProps {
  visible: boolean;
  isDark: boolean;
  apiKey: string;
  onAdd: (entries: ParsedFoodEntry[]) => void;
  onCancel: () => void;
}

export function PhotoAnalyzer({
  visible,
  isDark,
  apiKey,
  onAdd,
  onCancel,
}: PhotoAnalyzerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedFoodEntry[]>([]);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'camera' | 'confirm'>('camera');

  const reset = () => {
    setLoading(false);
    setParsed([]);
    setError('');
    setStep('camera');
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const handleAnalyze = async (base64: string, mimeType: string) => {
    if (!apiKey) {
      setError('No OpenAI API key found. Add your key in Goals → AI Settings.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await analyzePhotoFood(base64, mimeType, apiKey);
      if (result.length === 0) {
        setError('Could not identify food items. Try a clearer photo.');
      } else {
        setParsed(result);
        setStep('confirm');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Analysis failed. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    setLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (photo?.base64) {
        await handleAnalyze(photo.base64, 'image/jpeg');
      } else {
        setError('Failed to capture photo. Please try again.');
        setLoading(false);
      }
    } catch (e: any) {
      setError('Failed to capture photo.');
      setLoading(false);
    }
  };

  const handleWebFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const dataUrl = evt.target?.result as string;
      // dataUrl = "data:image/jpeg;base64,..."
      const commaIdx = dataUrl.indexOf(',');
      const mimeMatch = dataUrl.match(/^data:([^;]+);/);
      const mimeType = mimeMatch?.[1] ?? 'image/jpeg';
      const base64 = dataUrl.substring(commaIdx + 1);
      await handleAnalyze(base64, mimeType);
    };
    reader.readAsDataURL(file);
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
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: bg }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>📸 AI Photo Analysis</Text>
            <Pressable onPress={handleCancel} hitSlop={8}>
              <Text style={[styles.cancelBtn, { color: subColor }]}>✕</Text>
            </Pressable>
          </View>

          {step === 'camera' ? (
            <>
              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={Palette.primary} />
                  <Text style={[styles.loadingText, { color: textColor }]}>
                    Analyzing your food…
                  </Text>
                </View>
              ) : Platform.OS === 'web' ? (
                <View style={styles.webPickerBox}>
                  <Text style={[styles.label, { color: subColor }]}>
                    Take or upload a photo of your meal:
                  </Text>
                  {/* @ts-ignore — HTML input on web */}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleWebFilePick as any}
                    style={webInputStyle}
                  />
                  <Text style={[styles.webHint, { color: subColor }]}>
                    On mobile, this will open your camera or photo library.
                  </Text>
                </View>
              ) : !permission?.granted ? (
                <View style={styles.permBox}>
                  <Text style={[styles.label, { color: textColor }]}>
                    Camera access is needed to take food photos.
                  </Text>
                  <Pressable style={styles.btn} onPress={requestPermission}>
                    <Text style={styles.btnText}>Grant Camera Access</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.cameraContainer}>
                  <CameraView ref={cameraRef} style={styles.camera} facing="back" />
                  <Pressable style={styles.captureBtn} onPress={handleCapture}>
                    <View style={styles.captureRing}>
                      <View style={styles.captureInner} />
                    </View>
                  </Pressable>
                </View>
              )}
              {!!error && <Text style={styles.error}>{error}</Text>}
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
                  onPress={() => setStep('camera')}>
                  <Text style={[styles.btnText, { color: Palette.primary }]}>← Retake</Text>
                </Pressable>
                <Pressable style={styles.btn} onPress={handleConfirm}>
                  <Text style={styles.btnText}>Add All ✓</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const webInputStyle = {
  display: 'block',
  marginTop: 12,
  marginBottom: 8,
  padding: '10px 16px',
  borderRadius: 10,
  border: '1.5px solid #e5e7eb',
  fontSize: 15,
  cursor: 'pointer',
  width: '100%',
  boxSizing: 'border-box' as const,
};

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
    maxHeight: '90%',
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
  error: {
    color: Palette.error,
    fontSize: 13,
    marginTop: 10,
  },
  btn: {
    flex: 1,
    backgroundColor: Palette.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
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
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    marginTop: 8,
  },
  webPickerBox: {
    paddingVertical: 20,
  },
  webHint: {
    fontSize: 12,
    marginTop: 8,
  },
  permBox: {
    paddingVertical: 20,
    gap: 12,
  },
  cameraContainer: {
    height: 340,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  captureBtn: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
  },
  captureRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
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
