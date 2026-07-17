import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from '@/api/AuthContext';
import { useNotificationDeepLinks } from '@/api/notificationRouting';
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
  const colorScheme = useColorScheme();
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

  const palette = colorScheme === 'dark' ? Colors.dark : Colors.light;

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
              <Stack.Screen name="forgot-password" />
              <Stack.Screen name="verify-email" />
              <Stack.Screen name="jobs/[id]" options={{ headerShown: true, title: 'Opportunity' }} />
              <Stack.Screen name="school/students/[id]" options={{ headerShown: true, title: 'Student' }} />
              <Stack.Screen name="messages/[id]" options={{ headerShown: true, title: 'Messages' }} />
            </Stack>
            <OfflineBanner />
            <StatusBar style="auto" />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
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
