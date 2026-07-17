import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

const KEY = 'siwes-finder/theme-mode';

// A display preference, not sensitive -- AsyncStorage (not SecureStore) is
// the right home, same reasoning as the onboarding-seen flag.
export async function getStoredThemeMode(): Promise<ThemeMode> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export async function setStoredThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, mode);
  } catch {
    // Worst case the choice doesn't survive a restart; not worth surfacing.
  }
}
