import AsyncStorage from '@react-native-async-storage/async-storage';

export type AutoLockMinutes = 0 | 1 | 5 | 15 | 30; // 0 = never

const TIMEOUT_KEY = 'siwes-finder/auto-lock-minutes';
const BACKGROUNDED_AT_KEY = 'siwes-finder/backgrounded-at';

export const AUTO_LOCK_OPTIONS: { minutes: AutoLockMinutes; label: string }[] = [
  { minutes: 0, label: 'Never' },
  { minutes: 1, label: '1 minute' },
  { minutes: 5, label: '5 minutes' },
  { minutes: 15, label: '15 minutes' },
  { minutes: 30, label: '30 minutes' },
];

const DEFAULT_MINUTES: AutoLockMinutes = 5;

export async function getAutoLockMinutes(): Promise<AutoLockMinutes> {
  try {
    const raw = await AsyncStorage.getItem(TIMEOUT_KEY);
    const parsed = raw ? Number(raw) : DEFAULT_MINUTES;
    const match = AUTO_LOCK_OPTIONS.find((o) => o.minutes === parsed);
    return match ? match.minutes : DEFAULT_MINUTES;
  } catch {
    return DEFAULT_MINUTES;
  }
}

export async function setAutoLockMinutes(minutes: AutoLockMinutes): Promise<void> {
  try {
    await AsyncStorage.setItem(TIMEOUT_KEY, String(minutes));
  } catch {
    // Worst case the choice doesn't survive a restart; not worth surfacing.
  }
}

export async function markBackgrounded(): Promise<void> {
  try {
    await AsyncStorage.setItem(BACKGROUNDED_AT_KEY, String(Date.now()));
  } catch {
    // Best-effort -- a failed write here just means this one backgrounding
    // doesn't count toward the timeout.
  }
}

export async function clearBackgroundedMark(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BACKGROUNDED_AT_KEY);
  } catch {
    // Best-effort.
  }
}

/**
 * True if the configured auto-lock timeout has elapsed since the app was
 * last backgrounded. Backed entirely by persisted storage (not an in-memory
 * timer or ref), so it's checked identically on resume-from-background and
 * on a cold boot after the OS fully killed the app -- neither path can
 * bypass the timer.
 */
export async function hasAutoLockTimedOut(): Promise<boolean> {
  try {
    const [minutes, raw] = await Promise.all([
      getAutoLockMinutes(),
      AsyncStorage.getItem(BACKGROUNDED_AT_KEY),
    ]);
    if (minutes === 0 || !raw) return false;
    const backgroundedAt = Number(raw);
    if (!Number.isFinite(backgroundedAt)) return false;
    return Date.now() - backgroundedAt >= minutes * 60_000;
  } catch {
    return false;
  }
}
