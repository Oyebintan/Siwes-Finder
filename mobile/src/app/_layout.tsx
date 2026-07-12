import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AuthProvider } from '@/api/AuthContext';

// (tabs) holds the authenticated, role-gated experience (see
// (tabs)/_layout.tsx). login, signup, jobs/[id], school/students/[id], and
// messages/[id] are full-screen stack routes pushed on top, outside the tab bar.
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="jobs/[id]" options={{ headerShown: true, title: 'Opportunity' }} />
          <Stack.Screen name="school/students/[id]" options={{ headerShown: true, title: 'Student' }} />
          <Stack.Screen name="messages/[id]" options={{ headerShown: true, title: 'Messages' }} />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
