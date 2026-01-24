import { Palette } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';
import { feedback } from '@/utils/feedback';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

interface NutrientData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodData {
  name: string;
  nutrients: NutrientData;
  imageUrl?: string;
  servingSize?: number; // in grams or ml depending on unit
  unit?: 'g' | 'ml'; // Whether nutrition is per 100g or 100ml
  bestBefore?: string; // Expiration/best before date
}

export default function ScanScreen() {
  const { isDark } = useAppTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [foodData, setFoodData] = useState<FoodData | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [customAmount, setCustomAmount] = useState('100');
  const [servingSize, setServingSize] = useState('100');
  const [showEnlargedImage, setShowEnlargedImage] = useState(false);
  const [panY] = useState(new Animated.Value(0));
  const [unitType, setUnitType] = useState<'g' | 'ml' | 'dl'>('g'); // g=grams, ml=milliliters, dl=deciliters
  const [mealType, setMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>('Breakfast');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isWeb] = useState(Platform.OS === 'web');

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dy: panY }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 100) {
          // Dragged down far enough, dismiss modal
          handleCancel();
          panY.setValue(0);
        } else {
          // Snap back
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    // Initialize web camera if on web platform
    if (isWeb) {
      initWebCamera();
    }

    return () => {
      // Cleanup web camera
      if (isWeb && videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isWeb]);

  // Reset scanned state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setLoading(false);
      
      // Restart web scanning if needed
      if (isWeb && !scanIntervalRef.current) {
        startBarcodeScanning();
      }
      
      return () => {
        // Cleanup when losing focus
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
        }
      };
    }, [isWeb])
  );

  // Convert units for baking/powders
  const convertServingSize = (value: string, from: string, to: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;

    // Approximate conversions for common baking products
    const conversions: Record<string, Record<string, number>> = {
      g: { ml: 1.0, dl: 0.1 },    // 1g ≈ 1ml, 1g = 0.1dl (rough)
      ml: { g: 1.0, dl: 0.1 },
      dl: { g: 10, ml: 100 },
    };

    if (from === to) return value;
    if (!conversions[from] || !conversions[from][to]) return value;

    const converted = num * conversions[from][to];
    return converted.toFixed(1);
  };

  const initWebCamera = async () => {
    if (!isWeb) return;
    
    try {
      // Check if permission is already granted
      const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
      
      if (permissionStatus.state === 'denied') {
        await feedback.alert('Camera Access Denied', 'Please enable camera access in your browser settings to scan barcodes.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Start scanning for barcodes
        startBarcodeScanning();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      await feedback.alert('Camera Error', 'Could not access camera. Please check permissions in your browser settings.');
    }
  };

  const startBarcodeScanning = () => {
    if (!isWeb || !videoRef.current || !canvasRef.current) return;

    scanIntervalRef.current = setInterval(async () => {
      if (scanned || loading || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Use native Barcode Detection API if available
          if ('BarcodeDetector' in window) {
            try {
              const barcodeDetector = new (window as any).BarcodeDetector({
                formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e']
              });
              const barcodes = await barcodeDetector.detect(imageData);
              
              if (barcodes.length > 0) {
                handleBarCodeScanned({ type: barcodes[0].format, data: barcodes[0].rawValue });
              }
            } catch (err) {
              console.log('Barcode detection error:', err);
            }
          }
        }
      }
    }, 300); // Scan every 300ms
  };

  if (!permission) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.message, { marginBottom: 20, textAlign: 'center', paddingHorizontal: 20 }]}>
          Camera permission is required to scan barcodes
        </Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  const handleBarCodeScanned = async (result: { type: string; data: string }) => {
    if (scanned || loading) return;
    
    console.log('Barcode scanned:', result.data);
    
    setScanned(true);
    setLoading(true);

    // Stop web camera scanning
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    try {
      // Haptics only work on native
      if (!isWeb) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      const data = result.data;

      // Fetch from OpenFoodFacts API
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${data}.json`);
      const json = await response.json();

      if (json.status === 1 && json.product) {
        const product = json.product;
        const nutrients = product.nutriments || {};
        
        // Detect if product is liquid (milk, juice, etc.)
        const categories = (product.categories_tags || []).join('|').toLowerCase();
        const isLiquid = categories.includes('milk') || 
                        categories.includes('juice') || 
                        categories.includes('beverage') ||
                        categories.includes('drink') ||
                        categories.includes('yogurt') ||
                        categories.includes('liquid') ||
                        product.product_name?.toLowerCase().includes('milk') ||
                        product.product_name?.toLowerCase().includes('juice') ||
                        product.product_name?.toLowerCase().includes('drink');
        
        const productUnit = isLiquid ? 'ml' : 'g';

        const food: FoodData = {
          name: product.product_name || 'Unknown Product',
          nutrients: {
            calories: nutrients['energy-kcal_100g'] || nutrients['energy-kcal'] || 0,
            protein: nutrients['proteins_100g'] || nutrients.proteins || 0,
            carbs: nutrients['carbohydrates_100g'] || nutrients.carbohydrates || 0,
            fat: nutrients['fat_100g'] || nutrients.fat || 0,
          },
          imageUrl: product.image_front_url || product.image_url,
          servingSize: product.serving_quantity || 100, // Use API serving size or default to 100
          unit: productUnit, // Track if nutrition is per 100g or 100ml
          bestBefore: product.expiration_date || product.best_before_date, // Capture expiration info
        };

        setFoodData(food);
        setServingSize((food.servingSize || 100).toString());
        setUnitType(productUnit); // Set initial unit based on product type
        setShowOptions(true);
      } else {
        // Error feedback
        if (!isWeb) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        await feedback.alert('Product Not Found', 'Could not find nutrition data for this barcode.');
        setScanned(false);
        // Restart scanning on web
        if (isWeb) {
          startBarcodeScanning();
        }
      }
    } catch (error) {
      // Error feedback
      if (!isWeb) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      await feedback.alert('Error', 'Failed to fetch product data. Please try again.');
      setScanned(false);
      // Restart scanning on web
      if (isWeb) {
        startBarcodeScanning();
      }
    } finally {
      setLoading(false);
    }
  };

  const saveFood = async (totalGrams: number = 0) => {
    if (!foodData) return;

    try {
      const entries = await storage.get<any[]>(STORAGE_KEYS.FOOD_ENTRIES, []);
      
      const totalWeight = totalGrams > 0 ? totalGrams : parseFloat(customAmount) || 100;
      const multiplier = totalWeight / 100; // Convert grams to 100g units

      entries.push({
        id: Date.now().toString(),
        name: foodData.name,
        calories: foodData.nutrients.calories * multiplier,
        protein: foodData.nutrients.protein * multiplier,
        carbs: foodData.nutrients.carbs * multiplier,
        fat: foodData.nutrients.fat * multiplier,
        timestamp: Date.now(),
        mealType: mealType,
      });
      await storage.set(STORAGE_KEYS.FOOD_ENTRIES, entries);
      
      // Success haptic and feedback
      if (!isWeb) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      setShowOptions(false);
      setFoodData(null);
      router.back();
    } catch (error) {
      // Error haptic
      if (!isWeb) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      await feedback.alert('Error', 'Failed to save food entry.');
    }
  };

  const handleCustomAmount = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      if (!isWeb) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      feedback.alert('Invalid Amount', `Please enter a valid weight in ${unitType}.`);
      return;
    }
    if (!isWeb) {
      Haptics.selectionAsync();
    }
    
    // Convert to grams for storage
    let amountInGrams = amount;
    if (unitType === 'ml') {
      amountInGrams = amount; // 1ml ≈ 1g for calorie purposes
    } else if (unitType === 'dl') {
      amountInGrams = amount * 100; // 1dl = 100ml ≈ 100g
    }
    
    saveFood(amountInGrams);
  };

  const handleCancel = () => {
    setShowOptions(false);
    setFoodData(null);
    setScanned(false);
    setCustomAmount('100');
    setServingSize('100');
    setShowEnlargedImage(false);
    // Restart scanning on web
    if (isWeb) {
      startBarcodeScanning();
    }
  };

  return (
    <View style={styles.container}>
      {isWeb ? (
        <View style={styles.webCameraContainer}>
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            playsInline
            autoPlay
            muted
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <View style={styles.webOverlay}>
            <View style={styles.scanArea}>
              {loading && <ActivityIndicator size="large" color="#fff" style={styles.scanAreaLoader} />}
            </View>
            <Text style={styles.instruction}>
              {loading ? '✓ Scanning...' : '📷 Align barcode'}
            </Text>
            {loading && <Text style={styles.loadingText}>Looking up product data</Text>}
            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                if (!isWeb) {
                  Haptics.selectionAsync();
                }
                router.back();
              }}>
              <Text style={styles.cancelText}>✕ Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          enableTorch={false}
        >
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              {loading && <ActivityIndicator size="large" color="#fff" style={styles.scanAreaLoader} />}
            </View>
            <Text style={styles.instruction}>
              {loading ? '✓ Scanning...' : scanned ? '✓ Scanned!' : '📷 Align barcode with the center frame'}
            </Text>
            {loading && <Text style={styles.loadingText}>Looking up product data</Text>}
            {scanned && !loading && <Text style={styles.loadingText}>Barcode detected</Text>}
            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                Haptics.selectionAsync();
                router.back();
              }}>
              <Text style={styles.cancelText}>✕ Cancel</Text>
            </Pressable>
          </View>
        </CameraView>
      )}

      <Modal
        visible={showOptions}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          Keyboard.dismiss();
          handleCancel();
        }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <Animated.View 
                  style={[
                    styles.modalScrollView,
                    {
                      transform: [{ translateY: panY }],
                    }
                  ]}
                  {...panResponder.panHandlers}>
                  <ScrollView 
                    contentContainerStyle={styles.modalContentContainer}
                    keyboardShouldPersistTaps="handled">
                  <View style={styles.modalContent}>
                <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Pressable 
                style={styles.closeButton}
                onPress={handleCancel}>
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
              <View style={styles.headerContent}>
                <Text style={styles.modalTitle}>✓ Product Found</Text>
                <Text style={styles.productName}>{foodData?.name}</Text>
                {foodData?.bestBefore && (
                  <Text style={styles.bestBeforeText}>📅 Best Before: {foodData.bestBefore}</Text>
                )}
              </View>
            </View>
            
            {foodData?.imageUrl && (
              <Pressable 
                style={styles.imageContainer}
                onPress={() => setShowEnlargedImage(true)}>
                <Image 
                  source={{ uri: foodData.imageUrl }} 
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <Text style={styles.tapToEnlarge}>Tap to enlarge</Text>
              </Pressable>
            )}
            
            {foodData?.bestBefore && (
              <View style={styles.bestBeforeBox}>
                <Text style={styles.bestBeforeLabel}>📅 Best Before</Text>
                <Text style={styles.bestBeforeText}>{foodData.bestBefore}</Text>
              </View>
            )}
            
            <View style={styles.nutritionBox}>
              <Text style={styles.nutritionTitle}>📊 Nutrition (per 100{foodData?.unit === 'ml' ? 'ml' : 'g'})</Text>
              <Text style={styles.nutritionCalories}>
                {Math.round(foodData?.nutrients.calories || 0)} kcal
              </Text>
              <View style={styles.macrosGrid}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroValue}>{(parseFloat(foodData?.nutrients.protein?.toFixed(1) || '0'))}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={styles.macroValue}>{(parseFloat(foodData?.nutrients.carbs?.toFixed(1) || '0'))}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Fat</Text>
                  <Text style={styles.macroValue}>{(parseFloat(foodData?.nutrients.fat?.toFixed(1) || '0'))}g</Text>
                </View>
              </View>
            </View>

            <View style={styles.servingSizeContainer}>
              <View style={styles.servingSizeLabelRow}>
                <Text style={styles.servingSizeLabel}>⚖️ Serving Size</Text>
                <View style={styles.unitSelector}>
                  {['g', 'ml', 'dl'].map((unit) => (
                    <Pressable
                      key={unit}
                      style={[styles.unitButton, unitType === unit && styles.unitButtonActive]}
                      onPress={() => {
                        const converted = convertServingSize(servingSize, unitType, unit as 'g' | 'ml' | 'dl');
                        setServingSize(converted);
                        setUnitType(unit as 'g' | 'ml' | 'dl');
                      }}>
                      <Text style={[styles.unitButtonText, unitType === unit && styles.unitButtonTextActive]}>
                        {unit}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.servingSizeInputRow}>
                <TextInput
                  style={styles.servingSizeInput}
                  value={servingSize}
                  onChangeText={setServingSize}
                  keyboardType="decimal-pad"
                  placeholder="100"
                />
                <Text style={styles.servingSizeUnit}>{unitType}/item</Text>
              </View>
              <Text style={styles.servingSizeHint}>
                Each item weighs {servingSize || 100}{unitType}
              </Text>
            </View>

            <View style={styles.mealContainer}>
              <Text style={styles.quantityLabel}>🍽️ Meal</Text>
              <View style={styles.mealChips}>
                {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((meal) => (
                  <Pressable
                    key={meal}
                    style={[styles.mealChip, mealType === meal && styles.mealChipActive]}
                    onPress={() => setMealType(meal)}>
                    <Text style={[styles.mealChipText, mealType === meal && styles.mealChipTextActive]}>
                      {meal}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.quantityContainer}>
              <Text style={styles.quantityLabel}>🔢 Total Amount</Text>
              <View style={styles.quantityInputRow}>
                <TextInput
                  style={styles.quantityInput}
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  keyboardType="decimal-pad"
                  placeholder="100"
                />
                <Text style={styles.servingSizeUnit}>{unitType}</Text>
              </View>
              <Text style={styles.servingSizeHint}>
                Enter how much you consumed
              </Text>
            </View>

            <Pressable style={styles.optionButton} onPress={handleCustomAmount}>
              <Text style={styles.optionButtonText}>
                ✓ Add {customAmount || '100'}{unitType}
              </Text>
            </Pressable>

            <Pressable style={styles.cancelOptionButton} onPress={handleCancel}>
              <Text style={styles.cancelOptionText}>✗ Put Back on Shelf</Text>
            </Pressable>
              </View>
                </ScrollView>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showEnlargedImage}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowEnlargedImage(false)}>
        <Pressable 
          style={styles.enlargedImageOverlay}
          onPress={() => setShowEnlargedImage(false)}>
          <View style={styles.enlargedImageContainer}>
            {foodData?.imageUrl && (
              <Image 
                source={{ uri: foodData.imageUrl }} 
                style={styles.enlargedImage}
                resizeMode="contain"
              />
            )}
            <Text style={styles.closeText}>Tap anywhere to close</Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  webCameraContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  webOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 150,
    borderWidth: 3,
    borderColor: Palette.yellow,
    borderRadius: 12,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanAreaLoader: {
    marginBottom: 0,
  },
  instruction: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  message: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: Palette.primary,
    padding: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: Palette.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(255,107,107,0.4)',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalScrollView: {
    flex: 1,
    maxHeight: '90%',
  },
  modalContentContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  modalContent: {
    backgroundColor: Palette.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: Palette.lightGray,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: Palette.primary,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  closeButtonText: {
    fontSize: 18,
    color: Palette.darkGray,
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.primary,
    marginBottom: 6,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Palette.brown,
  },
  bestBeforeText: {
    fontSize: 13,
    color: '#d97706',
    fontWeight: '500',
    marginTop: 4,
  },
  imageContainer: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  tapToEnlarge: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    fontSize: 10,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  enlargedImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enlargedImageContainer: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enlargedImage: {
    width: '100%',
    height: '100%',
  },
  closeText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 16,
    opacity: 0.7,
  },
  bestBeforeBox: {
    backgroundColor: '#fff9e6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  bestBeforeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff9800',
    marginBottom: 4,
  },
  bestBeforeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d97706',
  },
  nutritionBox: {
    backgroundColor: Palette.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 0,
  },
  nutritionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  nutritionCalories: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Palette.white,
    marginBottom: 16,
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  macroItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 0,
  },
  macroLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Palette.white,
  },
  optionButton: {
    backgroundColor: Palette.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  optionButtonText: {
    color: Palette.white,
    fontSize: 17,
    fontWeight: '600',
  },
  quantityContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: Palette.lightGray2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: Palette.darkGray,
  },
  quantityInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    color: Palette.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  quantityInput: {
    flex: 1,
    backgroundColor: Palette.white,
    padding: 12,
    borderRadius: 8,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
    borderWidth: 2,
    borderColor: Palette.primary,
  },
  servingSizeContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: Palette.lightGray2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  servingSizeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: Palette.darkGray,
  },
  servingSizeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  servingSizeInput: {
    flex: 1,
    backgroundColor: Palette.white,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    borderWidth: 1,
    borderColor: Palette.primary,
  },
  servingSizeUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.darkGray,
  },
  servingSizeHint: {
    fontSize: 12,
    color: Palette.gray,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  mealContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: Palette.lightGray2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  mealChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  mealChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: '#d5d5d5',
  },
  mealChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  mealChipText: {
    color: Palette.darkGray,
    fontWeight: '600',
    fontSize: 14,
  },
  mealChipTextActive: {
    color: Palette.white,
  },
  customAmountContainer: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: Palette.lightGray,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.orange,
  },
  customLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: Palette.brown,
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customInput: {
    flex: 1,
    backgroundColor: Palette.white,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Palette.primary,
  },
  customButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
  },
  customButtonText: {
    color: Palette.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelOptionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  cancelOptionText: {
    color: Palette.darkGray,
    fontSize: 16,
    fontWeight: '600',
  },
  servingSizeLabelRow: {
    marginBottom: 12,
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1.5,
    borderColor: Palette.primary,
  },
  unitButtonActive: {
    backgroundColor: Palette.primary,
  },
  unitButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.primary,
  },
  unitButtonTextActive: {
    color: Palette.white,
  },
});
