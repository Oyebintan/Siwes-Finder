import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '@/api/AuthContext';
import { useNotificationDeepLinks } from '@/api/notificationRouting';

// (tabs) holds the authenticated, role-gated experience (see
// (tabs)/_layout.tsx). login, signup, forgot-password, onboarding,
// jobs/[id], school/students/[id], and messages/[id] are full-screen stack
// routes pushed on top, outside the tab bar.
export default function RootLayout() {
  const colorScheme = useColorScheme();
  useNotificationDeepLinks();

  return (
    <GestureHandlerRootView style={styles.flex}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            <Stack.Screen name="login" options={{ animation: 'fade' }} />
            <Stack.Screen name="signup" options={{ animation: 'fade' }} />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="jobs/[id]" options={{ headerShown: true, title: 'Opportunity' }} />
            <Stack.Screen name="school/students/[id]" options={{ headerShown: true, title: 'Student' }} />
            <Stack.Screen name="messages/[id]" options={{ headerShown: true, title: 'Messages' }} />
          </Stack>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
