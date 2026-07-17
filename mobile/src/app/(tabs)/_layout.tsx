import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, router, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
import { TabBarIcon } from '@/components/ui/tab-bar-icon';
import { VerifyEmailBanner } from '@/components/ui/verify-email-banner';
import { Radius, Spacing, TabBar } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';
import { confirmSignOut } from '@/api/confirmSignOut';
import { hasSeenOnboarding } from '@/api/onboardingFlag';
import { useIdleAutoLock } from '@/api/useIdleAutoLock';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(focused: IconName, unfocused: IconName) {
  return function TabIconSlot({ focused: isFocused }: { focused: boolean }) {
    return <TabBarIcon focused={isFocused} focusedIcon={focused} unfocusedIcon={unfocused} />;
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
//
// IMPORTANT expo-router rule this layout is built around: every file in
// this directory becomes a route whether or not it is declared below, and
// any route the layout doesn't mention still gets a default tab button
// (raw filename, no icon). Conditionally *omitting* <Tabs.Screen> entries
// therefore leaks every other role's screens into the tab bar -- exactly
// the "all dashboards merged" bug in the v1.0.0-android-ci5 build. So:
// every screen is always declared; the other roles' screens are removed
// with <Tabs.Protected guard={...}> (unroutable, not just hidden), and
// `index` -- the '/' anchor that login/verify-email/profile-setup land on --
// stays routable for every role (options: { href: null }, always hidden)
// and immediately redirects each role to its real landing tab.
export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, loading, logout } = useAuth();
  const [seenOnboarding, setSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    hasSeenOnboarding().then(setSeenOnboarding);
  }, []);

  useIdleAutoLock({ user, logout });

  if (loading || seenOnboarding === null) {
    return <BrandedLoading />;
  }

  if (!user) {
    // First launch on this install gets the intro slides; after that,
    // straight to login.
    return <Redirect href={seenOnboarding ? '/login' : '/onboarding'} />;
  }

  const isStudent = user.role === 'student';
  const isEmployer = user.role === 'employer';
  const isSchool = user.role === 'school';

  if (!isStudent && !isEmployer && !isSchool) {
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
          onPress={() =>
            confirmSignOut(async () => {
              await logout();
              router.replace('/login');
            })
          }
        />
      </ThemedView>
    );
  }

  // Floating glass pill: icon-only, detached from the screen edges, content
  // scrolls underneath (screens pad their bottom via useTabBarInset()). The
  // active tab sits in a filled brand pill (see ui/tab-bar-icon.tsx).
  const tabBarScreenOptions = {
    headerShown: false,
    // Subtle horizontal shift between tab scenes instead of a hard cut.
    animation: 'shift' as const,
    tabBarShowLabel: false,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: theme.primary,
    tabBarInactiveTintColor: theme.textSecondary,
    tabBarItemStyle: styles.tabItem,
    tabBarStyle: {
      position: 'absolute' as const,
      left: Spacing.four,
      right: Spacing.four,
      bottom: insets.bottom + TabBar.gap,
      height: TabBar.height,
      borderRadius: Radius.full,
      borderTopWidth: 0,
      // Slightly translucent so scrolled content glows through the glass.
      backgroundColor: `${theme.backgroundElement}F0`,
      shadowColor: '#0b1220',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 16,
    },
  };

  // Only the roles whose actions are actually gated on emailVerified
  // (applying, posting opportunities) show the nudge -- schools' mobile
  // screens are all read-only, so there's nothing to unlock for them.
  const showVerifyBanner = !user.emailVerified && (isStudent || isEmployer);

  return (
    <View style={styles.flex}>
      {showVerifyBanner ? <VerifyEmailBanner role={isStudent ? 'student' : 'employer'} /> : null}
      <Tabs
        screenOptions={tabBarScreenOptions}
        screenListeners={{
          // A light tick on every tab switch -- the same "everything
          // responds to touch" feel PressableScale gives buttons.
          tabPress: () => {
            Haptics.selectionAsync().catch(() => {});
          },
        }}
      >
        {/* '/' must stay routable for every role (login, verify-email, and
            profile-setup all replace to it), so it is declared unconditionally
            -- but it never renders its own screen (index.tsx immediately
            redirects to the role's real landing tab), so it's always hidden. */}
        <Tabs.Screen name="index" options={{ href: null }} />

        <Tabs.Protected guard={isStudent}>
          <Tabs.Screen
            name="dashboard"
            options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }}
          />
          <Tabs.Screen
            name="browse-jobs"
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
        </Tabs.Protected>

        <Tabs.Protected guard={isEmployer}>
          <Tabs.Screen
            name="employer-applicants"
            options={{ title: 'Applicants', tabBarIcon: tabIcon('people', 'people-outline') }}
          />
          <Tabs.Screen
            name="employer-logbook"
            options={{ title: 'Logbook', tabBarIcon: tabIcon('book', 'book-outline') }}
          />
        </Tabs.Protected>

        <Tabs.Protected guard={isSchool}>
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
        </Tabs.Protected>

        <Tabs.Protected guard={isEmployer || isSchool}>
          <Tabs.Screen
            name="account"
            options={{ title: 'Account', tabBarIcon: tabIcon('person-circle', 'person-circle-outline') }}
          />
        </Tabs.Protected>
      </Tabs>
    </View>
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
  tabItem: {
    // Center the icon pills vertically inside the 64px bar.
    height: TabBar.height,
    paddingVertical: (TabBar.height - 40) / 2,
  },
});
