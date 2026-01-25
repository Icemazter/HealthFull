import { ManualEntryModal } from '@/components/scan/ManualEntryModal';
import { useAppTheme } from '@/hooks/use-theme';
import { feedback } from '@/utils/feedback';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
}

type VolumeUnit = 'g' | 'ml' | 'dl' | 'tbsp' | 'tsp';

export default function ScanScreen() {
  const { isDark } = useAppTheme();
  const params = useLocalSearchParams<{ mode?: string; recipeId?: string }>();
  const isRecipeMode = params?.mode === 'recipe';
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
  const [mealScales] = useState({
    Breakfast: new Animated.Value(1),
    Lunch: new Animated.Value(1),
    Dinner: new Animated.Value(1),
    Snack: new Animated.Value(1),
  });
  const [celebrationScale] = useState(new Animated.Value(1));
  const [imageScale] = useState(new Animated.Value(1));
  const [unitType, setUnitType] = useState<VolumeUnit>('g'); // allow kitchen-friendly units
  const [mealType, setMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>('Breakfast');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webScannerRef = useRef<any>(null);
  const webScannerRunningRef = useRef(false);
  const webScannerControlsRef = useRef<any>(null);
  const [webScannerActive, setWebScannerActive] = useState(false);
  const [isWeb] = useState(Platform.OS === 'web');
  const [showManualEntry, setShowManualEntry] = useState(false);

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

  const animateMealChip = (meal: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack') => {
    if (!isWeb) {
      Haptics.selectionAsync();
    }
    
    // Spring scale animation
    Animated.sequence([
      Animated.spring(mealScales[meal], {
        toValue: 0.92,
        useNativeDriver: true,
        speed: 20,
      }),
      Animated.spring(mealScales[meal], {
        toValue: 1,
        useNativeDriver: true,
        speed: 15,
      }),
    ]).start();
    
    setMealType(meal);
  };

  const celebrateSuccess = () => {
    if (!isWeb) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Celebration pulse animation
    Animated.sequence([
      Animated.spring(celebrationScale, {
        toValue: 1.08,
        useNativeDriver: true,
        speed: 20,
      }),
      Animated.spring(celebrationScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
      }),
    ]).start();
  };

  const animateImageTap = () => {
    if (!isWeb) {
      Haptics.selectionAsync();
    }

    // Image scale animation on tap
    Animated.sequence([
      Animated.spring(imageScale, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 25,
      }),
      Animated.spring(imageScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
      }),
    ]).start();

    setShowEnlargedImage(true);
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
      const totalWeight = totalGrams > 0 ? totalGrams : parseFloat(customAmount) || 100;
      const multiplier = totalWeight / 100; // Convert grams to 100g units

      if (isRecipeMode) {
        // In recipe mode, pass ingredient back to recipe builder
        const ingredient = {
          id: `ing_${Date.now()}`,
          name: foodData.name,
          calories: foodData.nutrients.calories * multiplier,
          protein: foodData.nutrients.protein * multiplier,
          carbs: foodData.nutrients.carbs * multiplier,
          fat: foodData.nutrients.fat * multiplier,
          fiber: foodData.nutrients.fiber * multiplier,
          weightInGrams: totalWeight,
        };
        
        // Pass back with params
        router.back();
        // Store temp ingredient data to be picked up by recipe builder
        await storage.set('TEMP_SCANNED_INGREDIENT', ingredient);
        if (!isWeb) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        await feedback.success('Ingredient scanned!');
      } else {
        // Normal nutrition mode - add to daily food log
        const entries = (await storage.get<any[]>(STORAGE_KEYS.FOOD_ENTRIES, [])) ?? [];
        
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
      }
    } catch (error) {
      // Error haptic
      if (!isWeb) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      await feedback.alert('Error', 'Failed to process scanned item.');
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
            <Text style={[styles.instruction, { fontSize: 22, marginBottom: 12 }]}>
              {loading ? 'Looking it up...' : scanned ? 'Got it! Let\'s customize' : 'Point at barcode'}
            </Text>
            {loading && <Text style={[styles.loadingText, { fontSize: 14 }]}>Finding nutrition info...</Text>}
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
            <Text style={[styles.instruction, { marginBottom: 20, textAlign: 'center', paddingHorizontal: 20, fontSize: 22 }]}>
              {loading ? 'Looking it up...' : scanned ? 'Got it! Let\'s customize' : 'Point at barcode'}
            </Text>
            
            {loading && <Text style={[styles.loadingText, { fontSize: 14 }]}>Finding nutrition info...</Text>}
            
            <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 10 }}>
              <Pressable
                style={[styles.cancelButton, { flex: 1 }]}
                onPress={() => {
                  if (!isWeb) {
                    Haptics.selectionAsync();
                  }
                  router.back();
                }}>
                <Text style={styles.cancelText}>✕ Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.footerButton, styles.footerPrimaryButton, { flex: 1 }]}
                onPress={() => setShowManualEntry(true)}>
                <Text style={styles.footerButtonText}>✏️ Manual</Text>
              </Pressable>
            </View>
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
                <Text style={styles.modalTitle}>🎉 Product Found</Text>
                <Text style={styles.productName}>{foodData?.name}</Text>
                {foodData && foodData.nutrients.protein > 15 && (
                  <View style={styles.achievementBadge}>
                    <Text style={styles.achievementBadgeText}>💪 High Protein</Text>
                  </View>
                )}
              </View>
            </View>
            
            {foodData?.imageUrl && (
              <Animated.View style={[{ transform: [{ scale: imageScale }] }]}>
                <Pressable 
                  style={styles.imageContainer}
                  onPress={animateImageTap}>
                  <Image 
                    source={{ uri: foodData.imageUrl }} 
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imagePinIcon}>
                    <Text style={styles.imagePinText}>📌</Text>
                  </View>
                  <Text style={styles.tapToEnlarge}>Tap to enlarge</Text>
                </Pressable>
              </Animated.View>
            )}
            
            <View style={styles.nutritionBox}>
              <Text style={styles.nutritionTitle}>📊 Nutrition per 100{foodData?.unit === 'ml' ? 'ml' : 'g'}</Text>
              <Text style={styles.nutritionCalories}>
                {Math.round(foodData?.nutrients.calories || 0)} kcal
              </Text>
              <View style={styles.macrosGrid}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>PROTEIN</Text>
                  <Text style={styles.macroValue}>{(parseFloat(foodData?.nutrients.protein?.toFixed(1) || '0'))}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>CARBS</Text>
                  <Text style={styles.macroValue}>{(parseFloat(foodData?.nutrients.carbs?.toFixed(1) || '0'))}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>FAT</Text>
                  <Text style={styles.macroValue}>{(parseFloat(foodData?.nutrients.fat?.toFixed(1) || '0'))}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>FIBER</Text>
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
                <Text style={styles.servingSizeUnit}>{unitType}</Text>
              </View>
              <Text style={styles.servingSizeHint}>
                Each item: {servingSize || 100}{unitType}
              </Text>
            </View>

            <View style={styles.mealContainer}>
              <Text style={styles.quantityLabel}>🍽️ Meal</Text>
              <View style={styles.mealChips}>
                {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((meal) => (
                  <Animated.View
                    key={meal}
                    style={[
                      styles.mealChip,
                      mealType === meal && styles.mealChipActive,
                      { transform: [{ scale: mealScales[meal] }] }
                    ]}>
                    <Pressable
                      onPress={() => animateMealChip(meal)}>
                      <Text style={[styles.mealChipText, mealType === meal && styles.mealChipTextActive]}>
                        {meal}
                      </Text>
                    </Pressable>
                  </Animated.View>
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

            <Animated.View style={[{ transform: [{ scale: celebrationScale }] }]}>
              <Pressable 
                style={styles.optionButton} 
                onPress={() => {
                  celebrateSuccess();
                  handleCustomAmount();
                }}>
                <Text style={styles.optionButtonText}>
                  ✓ Add {customAmount || '100'}{unitType}
                </Text>
              </Pressable>
            </Animated.View>

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

      <ManualEntryModal
        visible={showManualEntry}
        onCancel={() => setShowManualEntry(false)}
        onAdd={async (entry) => {
          setShowManualEntry(false);
          const newEntry = {
            id: `food_${Date.now()}`,
            name: entry.name,
            calories: entry.calories,
            protein: entry.protein,
            carbs: entry.carbs,
            fat: entry.fat,
            fiber: entry.fiber,
            timestamp: Date.now(),
            mealType: mealType,
          };
          
          const entries = (await storage.get(STORAGE_KEYS.FOOD_ENTRIES, [])) || [];
          await storage.set(STORAGE_KEYS.FOOD_ENTRIES, [...entries, newEntry]);
          
          await feedback.success('Food added to today\'s meals');
          router.back();
        }}
      />
    </View>
  );
}
