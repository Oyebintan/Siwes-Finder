import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Field } from '@/components/ui/field';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';
import { ApiError, resendVerificationEmail, verifyEmail } from '@/api/client';

export default function VerifyEmailScreen() {
  const theme = useTheme();
  const { user, refreshUser, logout } = useAuth();

  const [email, setEmail] = useState(user?.email ?? '');
  const [otp, setOtp] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleVerify = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await verifyEmail(email.trim(), otp.trim());
      setDone(true);
      await refreshUser().catch(() => {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    setResending(true);
    try {
      const { message } = await resendVerificationEmail(email.trim());
      setInfo(message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection.');
    } finally {
      setResending(false);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(400)} style={styles.hero}>
              <View style={[styles.iconCircle, { backgroundColor: done ? theme.successSoft : theme.primarySoft }]}>
                <Ionicons
                  name={done ? 'checkmark-circle' : 'mail-unread-outline'}
                  size={30}
                  color={done ? theme.success : theme.primary}
                />
              </View>
              <ThemedText style={styles.title}>{done ? "You're verified" : 'Verify your email'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
                {done
                  ? 'Your email address is confirmed.'
                  : 'Enter the 6-digit code we emailed you when you signed up. It expires 10 minutes after being sent.'}
              </ThemedText>
            </Animated.View>

            {error ? <ErrorBanner message={error} /> : null}
            {info ? (
              <View style={[styles.notice, { backgroundColor: theme.successSoft }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color={theme.success} />
                <ThemedText themeColor="success" type="small">
                  {info}
                </ThemedText>
              </View>
            ) : null}

            {!done ? (
              <View style={styles.form}>
                <Animated.View entering={FadeInDown.duration(350).delay(100)}>
                  <Field
                    label="Email"
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@school.edu.ng"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                  />
                </Animated.View>
                <Animated.View entering={FadeInDown.duration(350).delay(160)}>
                  <Field
                    label="Verification code"
                    icon="keypad-outline"
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="6-digit code"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </Animated.View>
                <Animated.View entering={FadeInDown.duration(350).delay(220)}>
                  <Button
                    label="Verify email"
                    icon="checkmark"
                    onPress={handleVerify}
                    loading={loading}
                    disabled={!email.trim() || otp.trim().length < 6}
                  />
                </Animated.View>
                <PressableScale onPress={handleResend} style={styles.linkRow} haptic={false} disabled={resending || !email.trim()}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {resending ? 'Sending…' : "Didn't get it? "}
                    {!resending ? <ThemedText type="smallBold" themeColor="primary">Resend code</ThemedText> : null}
                  </ThemedText>
                </PressableScale>
                <PressableScale
                  onPress={async () => {
                    await logout();
                    router.replace('/login');
                  }}
                  style={styles.linkRow}
                  haptic={false}
                >
                  <ThemedText type="small" themeColor="textSecondary">
                    Wrong account or can&apos;t access this inbox? <ThemedText type="smallBold" themeColor="error">Sign out</ThemedText>
                  </ThemedText>
                </PressableScale>
              </View>
            ) : (
              <Animated.View entering={FadeInDown.duration(350)} style={styles.form}>
                <Button label="Continue" icon="arrow-forward" onPress={() => router.replace('/')} />
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.four,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 300,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  form: {
    gap: Spacing.three,
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
