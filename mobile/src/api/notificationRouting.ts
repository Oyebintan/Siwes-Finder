import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

// Every push the backend sends carries a `type` (and usually an id) in its
// data payload -- see sendPushNotification call sites in src/app/api/**.
// This maps each type to the screen the tap should land on. Payloads are
// external input, so ids are validated as MongoDB ObjectIds before being
// interpolated into a route.
const OBJECT_ID = /^[a-f\d]{24}$/i;

function asObjectId(value: unknown): string | null {
  return typeof value === 'string' && OBJECT_ID.test(value) ? value : null;
}

export function routeForNotification(data: Record<string, unknown> | undefined): string | null {
  switch (data?.type) {
    case 'application-status':
      return '/applications';
    case 'new-message': {
      const id = asObjectId(data.applicationId);
      return id ? `/messages/${id}` : null;
    }
    case 'logbook-approval':
    case 'logbook-streak-reminder':
      return '/logbook';
    case 'new-job-alert': {
      const id = asObjectId(data.jobId);
      return id ? `/jobs/${id}` : null;
    }
    default:
      return null;
  }
}

// Show pushes as banners even while the app is foregrounded -- without a
// handler, foreground notifications are silently dropped.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function navigate(path: string) {
  // If the user is logged out, the (tabs) auth gate redirects to /login on
  // its own -- pushing the target first is still correct for the common
  // (logged-in) case and harmless otherwise.
  router.push(path as Parameters<typeof router.push>[0]);
}

/**
 * Wire "tap a push → open the right screen". Handles both a warm app
 * (response listener) and a cold start from a notification (the initial
 * response is replayed once the router is mounted).
 */
export function useNotificationDeepLinks(): void {
  useEffect(() => {
    let handledColdStart = false;

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (handledColdStart || !response) return;
      handledColdStart = true;
      const path = routeForNotification(response.notification.request.content.data);
      if (path) navigate(path);
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const path = routeForNotification(response.notification.request.content.data);
      if (path) navigate(path);
    });
    return () => sub.remove();
  }, []);
}
