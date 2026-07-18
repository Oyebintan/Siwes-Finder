import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';
import { ApiError, setRole as setRoleRequest } from '@/api/client';

type PickableRole = 'student' | 'employer';

const OPTIONS: { role: PickableRole; icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    role: 'student',
    icon: 'school-outline',
    title: 'I am a Student',
    body: "I'm looking for an IT/SIWES placement and want to upload my resume.",
  },
  {
    role: 'employer',
    icon: 'business-outline',
    title: 'I am an Employer',
    body: 'I represent an organization and want to post openings to recruit students.',
  },
];

/**
 * First-time "how will you use this platform?" picker for a brand-new
 * Google sign-in (role starts 'unassigned' -- see api/googleAuth.ts /
 * login.tsx / signup.tsx). Mirrors the web's /onboarding page. Schools
 * aren't offered here, same as web -- school accounts are provisioned
 * separately, not self-served through Google sign-up.
 */
export default function RolePickerScreen() {
  const theme = useTheme();
  const { refreshUser } = useAuth();
  const [busyRole, setBusyRole] = useState<PickableRole | null>(null);
  const [error, setError] = useState('');

  const handlePick = async (role: PickableRole) => {
    setError('');
    setBusyRole(role);
    try {
      await setRoleRequest(role);
      await refreshUser();
      router.replace(role === 'student' ? '/profile-setup' : '/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection.');
      setBusyRole(null);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.container}>
          <Animated.View entering={FadeInDown.duration(450)} style={styles.hero}>
            <BrandLogo size={64} />
            <ThemedText style={styles.title}>Welcome to SIWES Finder</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
              We noticed you signed in with Google. How will you be using this platform?
            </ThemedText>
          </Animated.View>

          {error ? <ErrorBanner message={error} style={styles.errorBanner} /> : null}

          <View style={styles.options}>
            {OPTIONS.map((option, index) => {
              const busy = busyRole === option.role;
              const disabled = busyRole !== null;
              return (
                <Animated.View key={option.role} entering={FadeInDown.duration(400).delay(120 + index * 80)}>
                  <Card onPress={disabled ? undefined : () => handlePick(option.role)} style={disabled && !busy ? styles.disabledCard : undefined}>
                    <View style={styles.optionRow}>
                      <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
                        <Ionicons name={busy ? 'hourglass-outline' : option.icon} size={22} color={theme.primary} />
                      </View>
                      <View style={styles.optionText}>
                        <ThemedText type="subtitle" style={styles.optionTitle}>
                          {option.title}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {option.body}
                        </ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                    </View>
                  </Card>
                </Animated.View>
              );
            })}
          </View>
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
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.five,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: FontFamily.extrabold,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 320,
  },
  errorBanner: {
    alignSelf: 'stretch',
  },
  options: {
    gap: Spacing.three,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: Spacing.half,
  },
  optionTitle: {
    fontSize: 16,
    lineHeight: 21,
  },
  disabledCard: {
    opacity: 0.5,
  },
});
