import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'siwes-finder/onboarding-seen';

// A plain "has this install seen the intro slides" flag -- not sensitive,
// so AsyncStorage (not SecureStore) is the right home.
export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'true';
  } catch {
    // If storage is unreadable, err on the side of not trapping the user
    // in the intro loop.
    return true;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, 'true');
  } catch {
    // Worst case the slides show once more on next launch.
  }
}
