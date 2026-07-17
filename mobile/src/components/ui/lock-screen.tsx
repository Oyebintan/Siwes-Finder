import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { authenticateWithBiometrics } from '@/api/biometricSettings';
import { useAuth } from '@/api/AuthContext';
import { confirmSignOut } from '@/api/confirmSignOut';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BrandLogo } from './brand-logo';
import { Button } from './button';
import { ErrorBanner } from './error-banner';
import { PressableScale } from './pressable-scale';

/**
 * Full-screen overlay shown when the app is idle-locked (see
 * useIdleAutoLock / AuthContext) for a user with biometric unlock
 * enabled. Rendered on top of the still-mounted Stack in app/_layout.tsx
 * rather than replacing it, so navigation state underneath survives the
 * lock/unlock round trip.
 */
export function LockScreen() {
  const theme = useTheme();
  const { user, unlock, logout } = useAuth();
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState('');
  const promptedOnMount = useRef(false);

  const tryUnlock = async () => {
    setAuthenticating(true);
    setError('');
    try {
      const success = await authenticateWithBiometrics();
      if (success) unlock();
      else setError("Couldn't verify it's you — try again.");
    } finally {
      setAuthenticating(false);
    }
  };

  useEffect(() => {
    if (promptedOnMount.current) return;
    promptedOnMount.current = true;
    tryUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[styles.overlay, { backgroundColor: theme.background }]}
    >
      <SafeAreaView style={styles.center}>
        <BrandLogo size={64} />
        <ThemedText style={styles.title}>
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          Unlock to continue where you left off.
        </ThemedText>

        {error ? <ErrorBanner message={error} style={styles.errorBanner} /> : null}

        <View style={styles.actions}>
          <Button
            label={authenticating ? 'Waiting…' : 'Unlock'}
            icon="finger-print-outline"
            onPress={tryUnlock}
            loading={authenticating}
          />
          <PressableScale
            onPress={() =>
              confirmSignOut(async () => {
                await logout();
                router.replace('/login');
              })
            }
            style={styles.passwordRow}
            haptic={false}
          >
            <ThemedText type="smallBold" themeColor="primary">
              Use password instead
            </ThemedText>
          </PressableScale>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Above the Stack (and its own headers/tab bar) on both platforms.
    zIndex: 100,
    elevation: 100,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: FontFamily.extrabold,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 280,
  },
  errorBanner: {
    marginTop: Spacing.three,
    alignSelf: 'stretch',
  },
  actions: {
    marginTop: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
    alignSelf: 'stretch',
  },
  passwordRow: {
    paddingVertical: Spacing.two,
  },
});
