import { Expo, type ExpoPushMessage } from 'expo-server-sdk';

let client: Expo | null = null;

function getClient(): Expo {
  if (!client) client = new Expo();
  return client;
}

export function isValidExpoPushToken(token: string): boolean {
  return Expo.isExpoPushToken(token);
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!Expo.isExpoPushToken(token)) {
    throw new Error('Invalid Expo push token.');
  }

  const expo = getClient();
  const message: ExpoPushMessage = { to: token, sound: 'default', title, body, data };
  const [ticket] = await expo.sendPushNotificationsAsync([message]);

  if (ticket.status === 'error') {
    throw new Error(ticket.message || 'Failed to send push notification.');
  }
}
