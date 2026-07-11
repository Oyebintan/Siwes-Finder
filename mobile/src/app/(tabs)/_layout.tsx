import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Redirect, router, Tabs } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';

// Screens for student, employer, and school are all done as of Phase 3.
// admin/unassigned have no mobile screens in any phase (admin stays
// web-only by design; unassigned is a transient just-signed-up-via-Google
// state) -- they get the same holding screen employer/school used to fall
// back to before Phase 3.
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

  const tabBarScreenOptions = {
    headerShown: false,
    tabBarActiveTintColor: theme.primary,
    tabBarInactiveTintColor: theme.textSecondary,
    tabBarStyle: { backgroundColor: theme.backgroundElement, borderTopColor: theme.border },
  };

  if (user.role === 'student') {
    return (
      <Tabs screenOptions={tabBarScreenOptions}>
        <Tabs.Screen name="index" options={{ title: 'Jobs' }} />
        <Tabs.Screen name="applications" options={{ title: 'Applications' }} />
        <Tabs.Screen name="logbook" options={{ title: 'Logbook' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    );
  }

  if (user.role === 'employer') {
    return (
      <Tabs screenOptions={tabBarScreenOptions}>
        <Tabs.Screen name="employer-applicants" options={{ title: 'Applicants' }} />
        <Tabs.Screen name="employer-logbook" options={{ title: 'Logbook' }} />
        <Tabs.Screen name="account" options={{ title: 'Account' }} />
      </Tabs>
    );
  }

  if (user.role === 'school') {
    return (
      <Tabs screenOptions={tabBarScreenOptions}>
        <Tabs.Screen name="school-overview" options={{ title: 'Overview' }} />
        <Tabs.Screen name="school-students" options={{ title: 'Students' }} />
        <Tabs.Screen name="school-logbooks" options={{ title: 'Logbooks' }} />
        <Tabs.Screen name="account" options={{ title: 'Account' }} />
      </Tabs>
    );
  }

  return (
    <ThemedView style={styles.center}>
      <ThemedText type="subtitle" style={styles.centerText}>
        Coming soon for {user.role} accounts
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={[styles.centerText, styles.holdingCopy]}>
        The SIWES Finder app doesn&apos;t support this account type yet. Use the website instead.
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
