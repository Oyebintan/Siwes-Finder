import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { authenticateWithBiometrics, getBiometricEnabled, isBiometricHardwareReady } from '@/api/biometricSettings';
import { hasPinSet, verifyPin } from '@/api/pinSettings';
import { useAuth } from '@/api/AuthContext';
import { confirmSignOut } from '@/api/confirmSignOut';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BrandLogo } from './brand-logo';
import { Button } from './button';
import { ErrorBanner } from './error-banner';
import { PinDots, PinKeypad } from './pin-keypad';
import { PressableScale } from './pressable-scale';

const PIN_LENGTH = 4;

type UnlockMode = 'biometric' | 'pin';

/**
 * Full-screen overlay shown when the app is idle-locked (see
 * useIdleAutoLock / AuthContext) for a user with biometric or PIN unlock
 * configured. Rendered on top of the still-mounted Stack in
 * app/_layout.tsx rather than replacing it, so navigation state underneath
 * survives the lock/unlock round trip.
 *
 * Which mode shows on mount is resolved from what's actually configured
 * (not always biometric-first) -- a user with only a PIN set should never
 * see the OS biometric/PIN sheet fire on landing here.
 */
export function LockScreen() {
  const theme = useTheme();
  const { user, unlock, logout } = useAuth();
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<UnlockMode | null>(null);
  const [bothAvailable, setBothAvailable] = useState(false);
  const [pin, setPin] = useState('');
  const promptedOnMount = useRef(false);

  const tryBiometricUnlock = async () => {
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
    (async () => {
      const [biometricEnabled, hardwareReady, pinSet] = await Promise.all([
        getBiometricEnabled(),
        isBiometricHardwareReady(),
        hasPinSet(),
      ]);
      const biometricAvailable = biometricEnabled && hardwareReady;
      setBothAvailable(biometricAvailable && pinSet);
      setMode(biometricAvailable ? 'biometric' : 'pin');
    })();
  }, []);

  useEffect(() => {
    if (mode !== 'biometric' || promptedOnMount.current) return;
    promptedOnMount.current = true;
    tryBiometricUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleDigitPress = async (digit: string) => {
    if (authenticating || pin.length >= PIN_LENGTH) return;
    setError('');
    const next = pin + digit;
    setPin(next);
    if (next.length < PIN_LENGTH) return;

    setAuthenticating(true);
    const success = await verifyPin(next);
    setAuthenticating(false);
    if (success) {
      unlock();
    } else {
      setError('Incorrect PIN — try again.');
      setPin('');
    }
  };

  const handleBackspace = () => {
    setError('');
    setPin((current) => current.slice(0, -1));
  };

  const switchMode = () => {
    setError('');
    setPin('');
    setMode((current) => (current === 'biometric' ? 'pin' : 'biometric'));
  };

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
          {mode === 'pin' ? 'Enter your PIN to continue.' : 'Unlock to continue where you left off.'}
        </ThemedText>

        {error ? <ErrorBanner message={error} style={styles.errorBanner} /> : null}

        {mode === 'pin' ? (
          <View style={styles.pinArea}>
            <PinDots length={PIN_LENGTH} filled={pin.length} />
            <PinKeypad
              onDigit={handleDigitPress}
              onBackspace={handleBackspace}
              disabled={authenticating}
              canBackspace={pin.length > 0}
            />
          </View>
        ) : mode === 'biometric' ? (
          <View style={styles.actions}>
            <Button
              label={authenticating ? 'Waiting…' : 'Unlock'}
              icon="finger-print-outline"
              onPress={tryBiometricUnlock}
              loading={authenticating}
            />
          </View>
        ) : null}

        <View style={styles.linksRow}>
          {bothAvailable ? (
            <PressableScale onPress={switchMode} style={styles.passwordRow} haptic={false}>
              <ThemedText type="smallBold" themeColor="primary">
                {mode === 'biometric' ? 'Use PIN instead' : 'Use biometrics instead'}
              </ThemedText>
            </PressableScale>
          ) : null}
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
  linksRow: {
    marginTop: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'stretch',
  },
  pinArea: {
    marginTop: Spacing.five,
    alignItems: 'center',
    gap: Spacing.four,
  },
});
