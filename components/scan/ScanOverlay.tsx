import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface ScanOverlayProps {
  loading: boolean;
  scanned: boolean;
  isWeb: boolean;
  webScannerActive?: boolean;
  onCancel: () => void;
  onStartCamera?: () => void;
}

export function ScanOverlay({
  loading,
  scanned,
  isWeb,
  webScannerActive,
  onCancel,
  onStartCamera,
}: ScanOverlayProps) {
  if (isWeb) {
    return (
      <View style={styles.webOverlay}>
        <View style={styles.scanFrame}>
          {loading && <ActivityIndicator size="large" color="#fff" style={styles.scanAreaLoader} />}
        </View>
        <Text style={styles.instruction}>
          {loading ? '✓ Scanning...' : scanned ? '✓ Scanned!' : ''}
        </Text>
        {loading && <Text style={styles.loadingText}>Looking up product data</Text>}
        {!webScannerActive && !loading && onStartCamera && (
          <Pressable
            style={[styles.footerButton, styles.footerPrimaryButton, { marginTop: 8, marginBottom: 4 }]}
            onPress={onStartCamera}>
            <Text style={styles.footerButtonText}>▶ Start Camera</Text>
          </Pressable>
        )}
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>✕ Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <View style={styles.overlayContainer}>
        <View style={styles.topDarkArea} />
        <View style={styles.middleSection}>
          <View style={styles.sideDarkArea} />
          <View style={styles.scanFrame}>
            {loading && <ActivityIndicator size="large" color="#fff" style={styles.scanAreaLoader} />}
          </View>
          <View style={styles.sideDarkArea} />
        </View>
        <View style={styles.bottomDarkArea} />
      </View>
      <View style={styles.scanOverlay}>
        <Text style={[styles.instruction, { marginBottom: 20, textAlign: 'center', paddingHorizontal: 20 }]}>
          {loading ? '✓ Scanning...' : scanned ? '✓ Scanned!' : ''}
        </Text>
        {loading && <Text style={styles.loadingText}>Looking up product data</Text>}
        <Pressable style={[styles.cancelButton, { marginHorizontal: 20 }]} onPress={onCancel}>
          <Text style={styles.cancelText}>✕ Cancel</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topDarkArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '15%',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  bottomDarkArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '15%',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  middleSection: {
    position: 'absolute',
    top: '15%',
    left: 0,
    right: 0,
    height: '70%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideDarkArea: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  scanFrame: {
    width: '80%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
    pointerEvents: 'box-none',
  },
  scanAreaLoader: {
    marginBottom: 0,
  },
  instruction: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  footerButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerPrimaryButton: {
    backgroundColor: '#2563eb',
  },
  footerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
