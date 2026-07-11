import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Redirect, router, Tabs } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';

// Phase 1 (Student MVP) only builds screens for the student role. An
// employer/school account created via the mobile signup role tabs still
// needs somewhere to land -- this shows a holding screen instead of a
// broken/empty Jobs feed. Employer/school screens are Phase 3.
export default function TabsLayout() {
  const theme = useTheme();
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== 'student') {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="subtitle" style={styles.centerText}>
          Coming soon for {user.role} accounts
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={[styles.centerText, styles.holdingCopy]}>
          The SIWES Finder app currently supports students only. Use the website to manage your{' '}
          {user.role === 'employer' ? 'company' : 'school'} account.
        </ThemedText>
        <Pressable
          onPress={async () => {
            await logout();
            router.replace('/login');
          }}
          style={[styles.signOutButton, { borderColor: theme.border }]}
        >
          <ThemedText themeColor="error">Sign out</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.backgroundElement, borderTopColor: theme.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Jobs' }} />
      <Tabs.Screen name="applications" options={{ title: 'Applications' }} />
      <Tabs.Screen name="logbook" options={{ title: 'Logbook' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
  holdingCopy: {
    maxWidth: 320,
  },
  signOutButton: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.two,
  },
});
