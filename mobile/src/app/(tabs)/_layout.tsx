import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, type ColorValue } from 'react-native';
import { Redirect, router, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Button } from '@/components/ui/button';
import { VerifyEmailBanner } from '@/components/ui/verify-email-banner';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';
import { hasSeenOnboarding } from '@/api/onboardingFlag';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(focused: IconName, unfocused: IconName) {
  return function TabIcon({ color, focused: isFocused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={isFocused ? focused : unfocused} size={23} color={color} />;
  };
}

/** Branded session-restore state: the logomark gently pulsing. */
function BrandedLoading() {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1
    );
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <ThemedView style={styles.center}>
      <Animated.View style={style}>
        <BrandLogo size={72} />
      </Animated.View>
    </ThemedView>
  );
}

// Screens for student, employer, and school are all done as of Phase 3.
// admin/unassigned have no mobile screens in any phase (admin stays
// web-only by design; unassigned is a transient just-signed-up-via-Google
// state) -- they get the same holding screen employer/school used to fall
// back to before Phase 3.
export default function TabsLayout() {
  const theme = useTheme();
  const { user, loading, logout } = useAuth();
  const [seenOnboarding, setSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    hasSeenOnboarding().then(setSeenOnboarding);
  }, []);

  if (loading || seenOnboarding === null) {
    return <BrandedLoading />;
  }

  if (!user) {
    // First launch on this install gets the intro slides; after that,
    // straight to login.
    return <Redirect href={seenOnboarding ? '/login' : '/onboarding'} />;
  }

  const tabBarScreenOptions = {
    headerShown: false,
    tabBarActiveTintColor: theme.primary,
    tabBarInactiveTintColor: theme.textSecondary,
    tabBarLabelStyle: styles.tabLabel,
    tabBarStyle: {
      backgroundColor: theme.backgroundElement,
      borderTopColor: theme.border,
      ...(Platform.OS === 'android' ? { height: 62, paddingTop: 6, paddingBottom: 8 } : {}),
    },
  };

  // Only the roles whose actions are actually gated on emailVerified
  // (applying, posting opportunities) show the nudge -- schools' mobile
  // screens are all read-only, so there's nothing to unlock for them.
  const showVerifyBanner = !user.emailVerified && (user.role === 'student' || user.role === 'employer');

  if (user.role === 'student') {
    return (
      <View style={styles.flex}>
        {showVerifyBanner ? <VerifyEmailBanner /> : null}
        <Tabs screenOptions={tabBarScreenOptions}>
          <Tabs.Screen
            name="index"
            options={{ title: 'Jobs', tabBarIcon: tabIcon('briefcase', 'briefcase-outline') }}
          />
          <Tabs.Screen
            name="applications"
            options={{ title: 'Applications', tabBarIcon: tabIcon('paper-plane', 'paper-plane-outline') }}
          />
          <Tabs.Screen
            name="logbook"
            options={{ title: 'Logbook', tabBarIcon: tabIcon('book', 'book-outline') }}
          />
          <Tabs.Screen
            name="profile"
            options={{ title: 'Profile', tabBarIcon: tabIcon('person-circle', 'person-circle-outline') }}
          />
        </Tabs>
      </View>
    );
  }

  if (user.role === 'employer') {
    return (
      <View style={styles.flex}>
        {showVerifyBanner ? <VerifyEmailBanner /> : null}
        <Tabs screenOptions={tabBarScreenOptions}>
          <Tabs.Screen
            name="employer-applicants"
            options={{ title: 'Applicants', tabBarIcon: tabIcon('people', 'people-outline') }}
          />
          <Tabs.Screen
            name="employer-logbook"
            options={{ title: 'Logbook', tabBarIcon: tabIcon('book', 'book-outline') }}
          />
          <Tabs.Screen
            name="account"
            options={{ title: 'Account', tabBarIcon: tabIcon('person-circle', 'person-circle-outline') }}
          />
        </Tabs>
      </View>
    );
  }

  if (user.role === 'school') {
    return (
      <Tabs screenOptions={tabBarScreenOptions}>
        <Tabs.Screen
          name="school-overview"
          options={{ title: 'Overview', tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline') }}
        />
        <Tabs.Screen
          name="school-students"
          options={{ title: 'Students', tabBarIcon: tabIcon('people', 'people-outline') }}
        />
        <Tabs.Screen
          name="school-logbooks"
          options={{ title: 'Logbooks', tabBarIcon: tabIcon('book', 'book-outline') }}
        />
        <Tabs.Screen
          name="account"
          options={{ title: 'Account', tabBarIcon: tabIcon('person-circle', 'person-circle-outline') }}
        />
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
      <Button
        label="Sign out"
        variant="secondary"
        icon="log-out-outline"
        onPress={async () => {
          await logout();
          router.replace('/login');
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
