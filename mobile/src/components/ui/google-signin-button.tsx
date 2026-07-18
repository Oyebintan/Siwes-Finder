import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';
import { ApiError, type SessionUser } from '@/api/client';
import { GOOGLE_CLIENT_IDS } from '@/api/googleAuth';
import { PressableScale } from './pressable-scale';

// Lets a pending browser-based auth session resolve when the app regains
// focus after the OAuth redirect. Required once per app; safe at module
// scope since it's idempotent.
WebBrowser.maybeCompleteAuthSession();

interface GoogleSignInButtonProps {
  onError: (message: string) => void;
  onSuccess: (user: SessionUser) => void;
}

/**
 * Only ever rendered by a parent that has already checked
 * isGoogleSignInConfigured() (see login.tsx/signup.tsx) -- the underlying
 * expo-auth-session hook throws if handed an undefined client ID, so this
 * component must not mount at all on an unconfigured build.
 */
export function GoogleSignInButton({ onError, onSuccess }: GoogleSignInButtonProps) {
  const theme = useTheme();
  const { loginWithGoogle } = useAuth();
  const [exchanging, setExchanging] = useState(false);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: GOOGLE_CLIENT_IDS.android,
    iosClientId: GOOGLE_CLIENT_IDS.ios,
    webClientId: GOOGLE_CLIENT_IDS.web,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'error') {
      onError('Google sign-in was interrupted. Please try again.');
      return;
    }
    if (response.type !== 'success') return;

    const idToken = response.params.id_token || response.authentication?.idToken;
    if (!idToken) {
      onError('Google sign-in failed. Please try again.');
      return;
    }

    (async () => {
      setExchanging(true);
      try {
        const user = await loginWithGoogle(idToken);
        onSuccess(user);
      } catch (err) {
        onError(err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection.');
      } finally {
        setExchanging(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const disabled = !request || exchanging;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      disabled={disabled}
      onPress={() => {
        onError('');
        promptAsync().catch(() => onError('Google sign-in failed. Please try again.'));
      }}
      style={[
        styles.button,
        { borderColor: theme.border, backgroundColor: theme.backgroundElement },
        disabled && styles.disabled,
      ]}
    >
      {exchanging ? (
        <ActivityIndicator color={theme.text} size="small" />
      ) : (
        <>
          <GoogleGlyph size={18} />
          <ThemedText type="smallBold" maxFontSizeMultiplier={1.3}>
            Continue with Google
          </ThemedText>
        </>
      )}
    </PressableScale>
  );
}

function GoogleGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingVertical: Spacing.three,
    minHeight: 52,
  },
  disabled: {
    opacity: 0.5,
  },
});
