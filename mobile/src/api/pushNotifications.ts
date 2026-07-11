import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerPushToken } from './client';

// Registers this device for push notifications and hands the resulting
// Expo push token to the backend. Called once after login and once on app
// boot when a session is restored (see AuthContext).
//
// Fails silently (returns without throwing) in any situation where push
// genuinely can't work here: a simulator/emulator, a denied permission, or
// -- the common case in development -- no EAS project linked yet, which
// getExpoPushTokenAsync() needs to mint a token. Registering push is a
// nice-to-have, never something that should block or error out login.
export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerPushToken(token);
  } catch {
    // Network hiccup or an Expo push service error -- not worth surfacing
    // to the user, the next login/app-open retries.
  }
}
