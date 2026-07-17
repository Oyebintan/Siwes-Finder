import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const ENABLED_KEY = 'siwes-finder/biometric-unlock-enabled';

/** True if this device actually has a usable biometric/PIN credential set up. */
export async function isBiometricHardwareReady(): Promise<boolean> {
  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

export async function getBiometricEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    // Worst case the choice doesn't survive a restart; not worth surfacing.
  }
}

/**
 * Prompts the device's biometric/PIN sheet. `disableDeviceFallback: false`
 * (the default) is deliberate -- it lets the OS itself fall back to
 * whatever device credential is set up (PIN, pattern, password) when
 * Face ID/fingerprint fails or isn't available, so "unlock with
 * fingerprint or PIN or anyone their phone allows" comes for free from
 * the platform's own BiometricPrompt/LocalAuthentication sheet rather than
 * needing a second bespoke PIN implementation.
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock SIWES Finder',
      cancelLabel: 'Use password instead',
    });
    return result.success;
  } catch {
    return false;
  }
}
