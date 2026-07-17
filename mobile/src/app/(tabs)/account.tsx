import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Skeleton } from '@/components/ui/skeleton';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';
import { confirmSignOut } from '@/api/confirmSignOut';
import { getProfile } from '@/api/client';

const ROLE_LABEL: Record<string, string> = {
  employer: 'Company account',
  school: 'School account',
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
}

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
        <View style={styles.container}>
          <ScreenHeader title="Account" />

          <Animated.View entering={FadeInDown.duration(350).delay(80)}>
            <LinearGradient
              colors={[theme.gradientStart, theme.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <PressableScale
                onPress={() => router.push('/settings')}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Settings"
                style={styles.settingsButton}
              >
                <Ionicons name="settings-outline" size={19} color="#ffffff" />
              </PressableScale>
              <View style={styles.heroAvatar}>
                <ThemedText style={styles.heroInitials}>{initials(user?.name || '?')}</ThemedText>
              </View>
              <ThemedText style={styles.heroName}>{user?.name || 'Your account'}</ThemedText>
              {loading ? (
                <Skeleton width={160} height={14} />
              ) : (
                <ThemedText style={styles.heroEmail}>{email}</ThemedText>
              )}
              <View style={styles.heroBadge}>
                <Badge label={(user?.role && ROLE_LABEL[user.role]) || user?.role || 'Account'} tone="primary" icon="shield-checkmark-outline" />
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(160)} style={styles.footer}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.footerNote}>
              Company and verification details are managed on the website.
            </ThemedText>
            <Button
              label="Sign out"
              icon="log-out-outline"
              variant="danger"
              onPress={() =>
                confirmSignOut(async () => {
                  await logout();
                  router.replace('/login');
                })
              }
            />
          </Animated.View>
        </View>
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
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.five,
    borderRadius: Radius.xl,
    marginHorizontal: Spacing.four,
  },
  settingsButton: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    marginBottom: Spacing.two,
  },
  heroInitials: {
    color: '#ffffff',
    fontFamily: FontFamily.extrabold,
    fontSize: 24,
  },
  heroName: {
    color: '#ffffff',
    fontFamily: FontFamily.extrabold,
    fontSize: 20,
    lineHeight: 26,
  },
  heroEmail: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
  },
  heroBadge: {
    marginTop: Spacing.two,
  },
  footer: {
    marginTop: 'auto',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  footerNote: {
    textAlign: 'center',
  },
});
