// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendPushNotificationsAsync = vi.fn();

vi.mock('expo-server-sdk', () => {
  class Expo {
    static isExpoPushToken(token: unknown): boolean {
      return typeof token === 'string' && /^Expo(nent)?PushToken\[.+\]$/.test(token);
    }
    sendPushNotificationsAsync = sendPushNotificationsAsync;
  }
  return { Expo };
});

import { isValidExpoPushToken, sendPushNotification } from '@/lib/push';

const VALID_TOKEN = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

describe('isValidExpoPushToken', () => {
  it('accepts a well-formed Expo push token', () => {
    expect(isValidExpoPushToken(VALID_TOKEN)).toBe(true);
  });

  it('rejects an arbitrary string', () => {
    expect(isValidExpoPushToken('not-a-token')).toBe(false);
  });
});

describe('sendPushNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an invalid token before making any network call', async () => {
    await expect(sendPushNotification('garbage', 'Title', 'Body')).rejects.toThrow(/invalid expo push token/i);
    expect(sendPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it('sends a message with the given title/body/data', async () => {
    sendPushNotificationsAsync.mockResolvedValue([{ status: 'ok' }]);

    await sendPushNotification(VALID_TOKEN, 'Application accepted', 'Great news!', { applicationId: 'app1' });

    expect(sendPushNotificationsAsync).toHaveBeenCalledWith([
      { to: VALID_TOKEN, sound: 'default', title: 'Application accepted', body: 'Great news!', data: { applicationId: 'app1' } },
    ]);
  });

  it('throws when Expo returns an error ticket', async () => {
    sendPushNotificationsAsync.mockResolvedValue([{ status: 'error', message: 'DeviceNotRegistered' }]);

    await expect(sendPushNotification(VALID_TOKEN, 'Title', 'Body')).rejects.toThrow('DeviceNotRegistered');
  });
});
