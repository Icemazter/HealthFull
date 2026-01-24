import * as Haptics from 'expo-haptics';
import { Alert, Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

function showAlert(title: string, message?: string) {
  if (isWeb) {
    // Use browser-native alert on web
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

function showConfirm(title: string, message: string, onConfirm: () => void, onCancel?: () => void) {
  if (isWeb) {
    // Use browser-native confirm on web
    const result = window.confirm(`${title}\n\n${message}`);
    if (result) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: onCancel },
      { text: 'Confirm', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

export const feedback = {
  async success(message?: string, title = 'Success') {
    if (!isWeb) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (message) {
      showAlert(title, message);
    }
  },

  async error(message: string, title = 'Error') {
    if (!isWeb) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    showAlert(title, message);
  },

  async warning(message: string, title = 'Warning') {
    if (!isWeb) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    showAlert(title, message);
  },

  async selection() {
    if (!isWeb) {
      await Haptics.selectionAsync();
    }
  },

  confirm(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) {
    showConfirm(title, message, onConfirm, onCancel);
  },
};

export const validate = {
  number(value: string, minValue = 0): { valid: boolean; parsed: number } {
    const parsed = parseFloat(value);
    const valid = !isNaN(parsed) && parsed > minValue;
    return { valid, parsed };
  },

  required(value: string): boolean {
    return value.trim().length > 0;
  },
};
