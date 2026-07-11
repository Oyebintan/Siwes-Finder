import * as SecureStore from 'expo-secure-store';

// Bearer token from POST /api/mobile/login, kept in the OS's encrypted
// credential store (Keychain on iOS, Keystore-backed EncryptedSharedPreferences
// on Android) -- never AsyncStorage, which is plain unencrypted disk.
const TOKEN_KEY = 'siwes_finder_token';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
