import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { getBiometricEnabled, isBiometricHardwareReady } from './biometricSettings';

// A PIN hash (never the plaintext PIN) plus its per-install random salt,
// kept in the OS's encrypted credential store -- same convention as the
// bearer token in authStorage.ts. A PIN's keyspace is small by design
// (it's a quick local-unlock convenience, not the account's real secret --
// the bearer token still is), but hashing with a salt costs nothing and
// avoids storing it as plaintext.
const PIN_HASH_KEY = 'siwes_finder_pin_hash';
const PIN_SALT_KEY = 'siwes_finder_pin_salt';

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function hasPinSet(): Promise<boolean> {
  return (await SecureStore.getItemAsync(PIN_HASH_KEY)) !== null;
}

export async function setPin(pin: string): Promise<void> {
  const salt = Crypto.randomUUID();
  const hash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const [salt, storedHash] = await Promise.all([
    SecureStore.getItemAsync(PIN_SALT_KEY),
    SecureStore.getItemAsync(PIN_HASH_KEY),
  ]);
  if (!salt || !storedHash) return false;
  return (await hashPin(pin, salt)) === storedHash;
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
  await SecureStore.deleteItemAsync(PIN_SALT_KEY);
}

// Whether the app has ANY quick-unlock method configured (working
// biometric hardware with the toggle on, or a PIN) -- shared by the
// idle-timeout gate (useIdleAutoLock.ts) and the cold-boot restore check
// (AuthContext.tsx) so both agree on lock() vs. full logout().
export async function hasQuickUnlockConfigured(): Promise<boolean> {
  const [biometricEnabled, hardwareReady, pinSet] = await Promise.all([
    getBiometricEnabled(),
    isBiometricHardwareReady(),
    hasPinSet(),
  ]);
  return (biometricEnabled && hardwareReady) || pinSet;
}
