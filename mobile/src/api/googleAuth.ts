import { Platform } from 'react-native';

// Google issues a native OAuth client ID per platform (Android, iOS) plus a
// web client ID that also serves as the Expo Go / dev-build fallback.
// EXPO_PUBLIC_-prefixed vars are inlined into the JS bundle at build time
// (Expo's convention) -- these are OAuth client IDs, not secrets, so that's
// fine. See mobile/.env.example and MOBILE_APP.md for where they come from.
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const GOOGLE_CLIENT_IDS = {
  android: ANDROID_CLIENT_ID,
  ios: IOS_CLIENT_ID,
  web: WEB_CLIENT_ID,
};

// Google sign-in only renders once a real OAuth client ID exists for this
// platform -- the same "optional provider" pattern as the web app's
// GoogleProvider (src/lib/auth.ts). An unconfigured build just hides the
// button instead of showing a dead one: the underlying expo-auth-session
// hook throws if it's handed an undefined client ID, so this check must
// gate whether <GoogleSignInButton> ever mounts, not just whether it's
// pressable.
export function isGoogleSignInConfigured(): boolean {
  const clientId = Platform.select({ ios: IOS_CLIENT_ID, android: ANDROID_CLIENT_ID, default: WEB_CLIENT_ID });
  return !!clientId;
}
