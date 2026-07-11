import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AuthProvider } from '@/api/AuthContext';

// Plain Stack for Phase 0 (login <-> home). Tab navigation (Jobs,
// Applications, Logbook, Profile -- mirroring the web's dashboard nav in
// src/app/(dashboard)/layout.tsx) arrives in Phase 1 once there's more than
// one authenticated screen to switch between.
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
