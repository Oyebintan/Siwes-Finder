import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';

// Phase 0 proof-of-concept screen: confirms bearer-token auth works
// end-to-end against the live API (login -> token stored -> GET
// /api/profile succeeds). Real navigation (Jobs/Applications/Logbook/
// Profile tabs) arrives in Phase 1.
export default function HomeScreen() {
  const theme = useTheme();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user]);

  if (loading || !user) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Hello, {user.name || 'there'} 👋</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.role}>
          Signed in as {user.role} · {user.email}
        </ThemedText>

        <Pressable
          onPress={async () => {
            await logout();
            router.replace('/login');
          }}
          style={[styles.button, { borderColor: theme.border }]}
        >
          <ThemedText themeColor="error">Sign out</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  role: {
    marginBottom: Spacing.four,
  },
  button: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: 'auto',
  },
});
