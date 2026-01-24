import { STORAGE_KEYS } from '@/utils/storage';
import { useColorScheme } from 'react-native';
import { usePersistedState } from './use-persisted-state';

export function useAppTheme() {
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = usePersistedState<'light' | 'dark' | null>(
    STORAGE_KEYS.DARK_MODE,
    null
  );

  const isDark = colorScheme === 'dark' || (colorScheme === null && systemColorScheme === 'dark');

  const toggleTheme = async () => {
    const newMode = colorScheme === 'dark' ? 'light' : colorScheme === 'light' ? null : 'dark';
    await setColorScheme(newMode);
  };

  return { isDark, colorScheme, setColorScheme, toggleTheme };
}
