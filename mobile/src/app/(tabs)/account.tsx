import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';
import { getProfile } from '@/api/client';

const ROLE_LABEL: Record<string, string> = {
  employer: 'Company account',
  school: 'School account',
};

// A lightweight account screen for employer/school -- full profile editing
// (company details, verification submission, etc.) stays web-only for now;
// Phase 3's mobile scope for these roles is applicant/logbook review and
// the school's read-only dashboards, not account management.
export default function AccountScreen() {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const profile = await getProfile();
        setEmail(profile.email);
      } catch {
        // Keep whatever we already have from the auth session.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={styles.headerTitle}>
            Account
          </ThemedText>

          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">{user?.name || 'Your account'}</ThemedText>
            {loading ? (
              <ActivityIndicator color={theme.primary} style={styles.emailLoading} />
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                {email}
              </ThemedText>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              {(user?.role && ROLE_LABEL[user.role]) || user?.role}
            </ThemedText>
          </ThemedView>

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
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  emailLoading: {
    alignSelf: 'flex-start',
  },
  signOutButton: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: 'auto',
  },
});
