import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider, useAuth } from '@/api/AuthContext';
import { useNotificationDeepLinks } from '@/api/notificationRouting';
import { ThemeModeProvider, useThemeMode } from '@/api/ThemeModeContext';
import { LockScreen } from '@/components/ui/lock-screen';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { ToastProvider } from '@/components/ui/toast';
import { FontFamily, Colors } from '@/constants/theme';

// Hold the native splash until the brand font is ready, so the first
// painted frame is already in Manrope instead of flashing system font.
SplashScreen.preventAutoHideAsync().catch(() => {});

// (tabs) holds the authenticated, role-gated experience (see
// (tabs)/_layout.tsx). login, signup, forgot-password, onboarding,
// jobs/[id], school/students/[id], and messages/[id] are full-screen stack
// routes pushed on top, outside the tab bar.
export default function RootLayout() {
  useNotificationDeepLinks();

  const [fontsLoaded] = useFonts({
    Manrope_400Regular: require('../../assets/fonts/Manrope_400Regular.ttf'),
    Manrope_500Medium: require('../../assets/fonts/Manrope_500Medium.ttf'),
    Manrope_600SemiBold: require('../../assets/fonts/Manrope_600SemiBold.ttf'),
    Manrope_700Bold: require('../../assets/fonts/Manrope_700Bold.ttf'),
    Manrope_800ExtraBold: require('../../assets/fonts/Manrope_800ExtraBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <ThemeModeProvider>
        <RootLayoutInner />
      </ThemeModeProvider>
    </GestureHandlerRootView>
  );
}

// Split out so it can read the resolved theme from ThemeModeProvider --
// that provider has to be above this, not inside it.
function RootLayoutInner() {
  const { effectiveScheme } = useThemeMode();
  const palette = effectiveScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <ThemeProvider value={effectiveScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <ToastProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              // Branded chrome for the stack screens that do show a
              // header (detail pages): app surface color, no hairline or
              // drop shadow, bold title, unlabeled back arrow.
              headerStyle: { backgroundColor: palette.backgroundElement },
              headerShadowVisible: false,
              headerTintColor: palette.text,
              headerTitleStyle: styles.headerTitle,
              headerBackButtonDisplayMode: 'minimal',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            <Stack.Screen name="login" options={{ animation: 'fade' }} />
            <Stack.Screen name="signup" options={{ animation: 'fade' }} />
            <Stack.Screen name="profile-setup" options={{ animation: 'fade' }} />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="verify-email" />
            <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />
            <Stack.Screen name="jobs/[id]" options={{ headerShown: true, title: 'Opportunity' }} />
            <Stack.Screen name="school/students/[id]" options={{ headerShown: true, title: 'Student' }} />
            <Stack.Screen name="messages/[id]" options={{ headerShown: true, title: 'Messages' }} />
          </Stack>
          <OfflineBanner />
          {/* expo-status-bar's "auto" tracks the OS appearance, not our
              in-app override -- explicit here so a manually-chosen theme
              never mismatches the status bar. */}
          <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
          <LockGate />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Overlays the whole app (Stack, banners, everything) with LockScreen
// while idle-locked, WITHOUT unmounting the Stack underneath -- keeps
// navigation state intact across a lock/unlock round trip. Split into its
// own component because useAuth() needs to be inside AuthProvider, one
// level below where RootLayoutInner itself can call it.
function LockGate() {
  const { locked } = useAuth();
  return locked ? <LockScreen /> : null;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FontFamily.extrabold,
    fontSize: 17,
  },
});
