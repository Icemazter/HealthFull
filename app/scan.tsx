import { useAppTheme } from '@/hooks/use-theme';
import { feedback } from '@/utils/feedback';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { scanStyles as styles } from './scan.styles';

interface NutrientData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface FoodData {
  name: string;
  nutrients: NutrientData;
  imageUrl?: string;
  servingSize?: number; // in grams or ml depending on unit
  unit?: 'g' | 'ml'; // Whether nutrition is per 100g or 100ml
  bestBefore?: string; // Expiration/best before date
}

type VolumeUnit = 'g' | 'ml' | 'dl' | 'tbsp' | 'tsp';

export default function ScanScreen() {
  const { isDark } = useAppTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [foodData, setFoodData] = useState<FoodData | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [customAmount, setCustomAmount] = useState('100');
  const [servingSize, setServingSize] = useState('100');
  const [showEnlargedImage, setShowEnlargedImage] = useState(false);
  const [panY] = useState(new Animated.Value(0));
  const [unitType, setUnitType] = useState<VolumeUnit>('g'); // allow kitchen-friendly units
  const [mealType, setMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>('Breakfast');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webScannerRef = useRef<any>(null);
  const webScannerRunningRef = useRef(false);
  const webScannerControlsRef = useRef<any>(null);
  const [webScannerActive, setWebScannerActive] = useState(false);
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
      if (isWeb) {
        stopWebScanner();
      }
    };
  }, [isWeb]);

  useEffect(() => {
    if (isWeb && permission?.granted) {
      initWebCamera();
    }
  }, [isWeb, permission?.granted]);

  // Reset scanned state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setLoading(false);
      setCameraKey((prev) => prev + 1);
      
      // Request camera permission on focus if not granted
      if (!isWeb && permission && !permission.granted) {
        requestPermission();
      }
      
      // Restart web scanning if needed
      if (isWeb && !webScannerRunningRef.current) {
        startBarcodeScanning();
      }
      
      return () => {
        // Cleanup when losing focus
        if (isWeb) {
          stopWebScanner();
        }
      };
    }, [isWeb, permission, requestPermission])
  );

  // Convert units for baking/powders
  const convertServingSize = (value: string, from: VolumeUnit, to: VolumeUnit): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;

    // Approximate conversions for common kitchen units
    const unitToGram: Record<VolumeUnit, number> = {
      g: 1,
      ml: 1,    // assume water-like density for quick logging
      dl: 100,
      tbsp: 15,
      tsp: 5,
    };

    if (from === to) return value;
    if (!unitToGram[from] || !unitToGram[to]) return value;

    const grams = num * unitToGram[from];
    const converted = grams / unitToGram[to];
    return converted.toFixed(1);
  };

  const initWebCamera = async () => {
    if (!isWeb) return;
    
    try {
      // Check if permission is already granted
      const permissionStatus = navigator.permissions?.query
        ? await navigator.permissions.query({ name: 'camera' as PermissionName })
        : null;
      
      if (permissionStatus?.state === 'denied') {
        await feedback.alert('Camera Access Denied', 'Please enable camera access in your browser settings to scan barcodes.');
        return;
      }
      // Start scanning for barcodes (web)
      startBarcodeScanning();
    } catch (error) {
      console.error('Error accessing camera:', error);
      await feedback.alert('Camera Error', 'Could not access camera. Please check permissions in your browser settings.');
    }
  };

  const startBarcodeScanning = () => {
    if (!isWeb || webScannerRunningRef.current) return;

    const startWebScanner = async () => {
      try {
        const module = await import('@zxing/library');
        const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } = module as typeof import('@zxing/library');

        if (!videoRef.current) {
          console.error('Web video element not ready');
          return;
        }

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
        ]);

        const codeReader = new BrowserMultiFormatReader(hints, 500);
        webScannerRef.current = codeReader;
        webScannerRunningRef.current = true;
        setWebScannerActive(true);

        const constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        };

        const controls = await codeReader.decodeFromConstraints(
          constraints,
          videoRef.current,
          (result, err) => {
            if (result) {
              const decodedText = result.getText();
              if (loading || scanned) return;
              handleBarCodeScanned({ type: 'ean13', data: decodedText });
              return;
            }
          }
        );

        webScannerControlsRef.current = controls;
      } catch (err) {
        console.error('Web barcode scanner error:', err);
        webScannerRunningRef.current = false;
        setWebScannerActive(false);
      }
    };

    startWebScanner();
  };

  const stopWebScanner = async () => {
    if (!isWeb || !webScannerRef.current) return;

    try {
      if (webScannerControlsRef.current?.stop) {
        await webScannerControlsRef.current.stop();
      }
      if (webScannerRef.current?.reset) {
        webScannerRef.current.reset();
      }
    } catch (err) {
      console.log('Web scanner stop error:', err);
    } finally {
      webScannerRef.current = null;
      webScannerControlsRef.current = null;
      webScannerRunningRef.current = false;
      setWebScannerActive(false);
    }
  };

  if (!permission) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={[styles.message, { marginBottom: 20, textAlign: 'center', fontSize: 16, fontWeight: '600' }]}>
          📷 Camera Permission Required
        </Text>
        <Text style={[styles.message, { marginBottom: 30, textAlign: 'center', fontSize: 14, opacity: 0.7 }]}>
          HealthFull needs camera access to scan product barcodes and look up nutrition information.
        </Text>
        <Pressable style={[styles.button, { backgroundColor: '#FF3B30', paddingVertical: 14, width: '100%' }]} onPress={requestPermission}>
          <Text style={[styles.buttonText, { fontSize: 16, fontWeight: 'bold' }]}>✓ Grant Camera Access</Text>
        </Pressable>
        <Text style={[styles.message, { marginTop: 20, textAlign: 'center', fontSize: 12, opacity: 0.6 }]}>
          You can change this later in Settings
        </Text>
      </View>
    );
  }

  const handleBarCodeScanned = async (result: { type: string; data: string }) => {
    // Prevent multiple simultaneous scans
    if (loading) {
      console.log('🔄 Already loading, ignoring scan');
      return;
    }
    
    console.log('📱 Barcode scanned:', result.data, 'Type:', result.type);
    
    setScanned(true);
    setLoading(true);

    if (isWeb) {
      stopWebScanner();
    }

    try {
      // Haptics only work on native
      if (!isWeb) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      const data = result.data;

      // Fetch from OpenFoodFacts API
      console.log('🌐 Fetching OpenFoodFacts API for:', data);
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${data}.json`);
      const json = await response.json();

      console.log('📦 API Response:', json.status, json.product?.product_name);

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
            fiber: nutrients['fiber_100g'] || nutrients['fibers_100g'] || nutrients.fiber || nutrients.fibers || 0,
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
        console.log('❌ Product not found (status:', json.status, ')');
        if (!isWeb) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        await feedback.alert('Product Not Found', 'Could not find nutrition data for this barcode.');
        setScanned(false);
        setLoading(false);
        // Restart scanning on web
        if (isWeb) {
          startBarcodeScanning();
        }
      }
    } catch (error) {
      // Error feedback
      console.error('⚠️ Error fetching product:', error);
      if (!isWeb) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      await feedback.alert('Error', 'Failed to fetch product data. Please try again.');
      setScanned(false);
      setLoading(false);
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
      const entries = (await storage.get<any[]>(STORAGE_KEYS.FOOD_ENTRIES, [])) ?? [];
      
      const totalWeight = totalGrams > 0 ? totalGrams : parseFloat(customAmount) || 100;
      const multiplier = totalWeight / 100; // Convert grams to 100g units

      entries.push({
        id: Date.now().toString(),
        name: foodData.name,
        calories: foodData.nutrients.calories * multiplier,
        protein: foodData.nutrients.protein * multiplier,
        carbs: foodData.nutrients.carbs * multiplier,
        fat: foodData.nutrients.fat * multiplier,
        fiber: foodData.nutrients.fiber * multiplier,
        timestamp: Date.now(),
        mealType: mealType,
      });
      await storage.set(STORAGE_KEYS.FOOD_ENTRIES, entries);
      
      // Success haptic and feedback
      if (!isWeb) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Reset state
      setScanned(false);
      setLoading(false);
      setShowOptions(false);
      setFoodData(null);
      handleCancel();
    } catch (error) {
      // Error haptic
      if (!isWeb) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      await feedback.alert('Error', 'Failed to save food entry.');
      // Reset state on error too
      setScanned(false);
      setLoading(false);
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
    
    // Convert to grams for storage using kitchen-friendly factors
    const unitToGramFactor: Record<VolumeUnit, number> = {
      g: 1,
      ml: 1,
      dl: 100,
      tbsp: 15,
      tsp: 5,
    };
    const amountInGrams = amount * (unitToGramFactor[unitType] ?? 1);
    
    saveFood(amountInGrams);
  };

  const handleCancel = () => {
    setScanned(false);
    setLoading(false);
    setShowOptions(false);
    setFoodData(null);
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
          <View style={styles.webOverlay}>
            <View style={styles.scanFrame}>
              {loading && <ActivityIndicator size="large" color="#fff" style={styles.scanAreaLoader} />}
            </View>
            <Text style={styles.instruction}>
              {loading ? '✓ Scanning...' : scanned ? '✓ Scanned!' : ''}
            </Text>
            {loading && <Text style={styles.loadingText}>Looking up product data</Text>}
            {!webScannerActive && !loading && (
              <Pressable
                style={[styles.footerButton, styles.footerPrimaryButton, { marginTop: 8, marginBottom: 4 }]}
                onPress={() => startBarcodeScanning()}>
                <Text style={styles.footerButtonText}>▶ Start Camera</Text>
              </Pressable>
            )}
            
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
        <>
          <CameraView
            key={cameraKey}
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
            }}
            onBarcodeScanned={!scanned ? handleBarCodeScanned : undefined}
          />
          <View style={styles.overlayContainer}>
            {/* Top dark overlay */}
            <View style={styles.topDarkArea} />
            
            {/* Middle section with side darks */}
            <View style={styles.middleSection}>
              <View style={styles.sideDarkArea} />
              <View style={styles.scanFrame}>
                {loading && <ActivityIndicator size="large" color="#fff" style={styles.scanAreaLoader} />}
              </View>
              <View style={styles.sideDarkArea} />
            </View>
            
            {/* Bottom dark overlay */}
            <View style={styles.bottomDarkArea} />
          </View>
          <View style={styles.scanOverlay}>
            <Text style={[styles.instruction, { marginBottom: 20, textAlign: 'center', paddingHorizontal: 20 }]}>
              {loading ? '✓ Scanning...' : scanned ? '✓ Scanned!' : ''}
            </Text>
            
            {loading && <Text style={styles.loadingText}>Looking up product data</Text>}
            
            <Pressable
              style={[styles.cancelButton, { marginHorizontal: 20 }]}
              onPress={() => {
                if (!isWeb) {
                  Haptics.selectionAsync();
                }
                router.back();
              }}>
              <Text style={styles.cancelText}>✕ Cancel</Text>
            </Pressable>
          </View>
        </>
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
                <Text style={styles.bestBeforeValue}>{foodData.bestBefore}</Text>
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
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Fiber</Text>
                  <Text style={styles.macroValue}>{(parseFloat(foodData?.nutrients.fiber?.toFixed(1) || '0'))}g</Text>
                </View>
              </View>
            </View>

            <View style={styles.servingSizeContainer}>
              <View style={styles.servingSizeLabelRow}>
                <Text style={styles.servingSizeLabel}>⚖️ Serving Size</Text>
                <View style={styles.unitSelector}>
                  {['g', 'ml', 'dl', 'tbsp', 'tsp'].map((unit) => (
                    <Pressable
                      key={unit}
                      style={[styles.unitButton, unitType === unit && styles.unitButtonActive]}
                      onPress={() => {
                        const converted = convertServingSize(servingSize, unitType, unit as 'g' | 'ml' | 'dl' | 'tbsp' | 'tsp');
                        setServingSize(converted);
                        setUnitType(unit as 'g' | 'ml' | 'dl' | 'tbsp' | 'tsp');
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
