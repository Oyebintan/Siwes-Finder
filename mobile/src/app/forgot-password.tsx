import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Field } from '@/components/ui/field';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, requestPasswordReset, resetPassword } from '@/api/client';

type Step = 'email' | 'reset' | 'done';

export default function ForgotPasswordScreen() {
  const theme = useTheme();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequest = async () => {
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setStep('reset');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError('');
    setLoading(true);
    try {
      await resetPassword(email.trim(), otp.trim(), newPassword);
      setStep('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
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
              <View style={[styles.iconCircle, { backgroundColor: theme.primarySoft }]}>
                <Ionicons
                  name={step === 'done' ? 'checkmark-circle' : 'key-outline'}
                  size={30}
                  color={step === 'done' ? theme.success : theme.primary}
                />
              </View>
              <ThemedText style={styles.title}>
                {step === 'email' ? 'Reset your password' : step === 'reset' ? 'Check your email' : 'Password updated'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
                {step === 'email'
                  ? "Enter your account's email and we'll send you a 6-digit reset code."
                  : step === 'reset'
                    ? `We sent a code to ${email.trim()}. It expires in 10 minutes.`
                    : 'Your password has been changed. Log in with the new one.'}
              </ThemedText>
            </Animated.View>

            {error ? <ErrorBanner message={error} /> : null}

            {step === 'email' ? (
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
                    returnKeyType="send"
                    onSubmitEditing={handleRequest}
                  />
                </Animated.View>
                <Animated.View entering={FadeInDown.duration(350).delay(180)}>
                  <Button
                    label="Send reset code"
                    icon="paper-plane-outline"
                    onPress={handleRequest}
                    loading={loading}
                    disabled={!email.trim()}
                  />
                </Animated.View>
              </View>
            ) : null}

            {step === 'reset' ? (
              <View style={styles.form}>
                <Animated.View entering={FadeInDown.duration(350)}>
                  <Field
                    label="Reset code"
                    icon="keypad-outline"
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="6-digit code"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </Animated.View>
                <Animated.View entering={FadeInDown.duration(350).delay(80)}>
                  <Field
                    label="New password"
                    icon="lock-closed-outline"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="At least 8 characters"
                    password
                    autoComplete="password-new"
                  />
                </Animated.View>
                <Animated.View entering={FadeInDown.duration(350).delay(160)}>
                  <Button
                    label="Set new password"
                    icon="checkmark"
                    onPress={handleReset}
                    loading={loading}
                    disabled={otp.trim().length < 6 || newPassword.length < 8}
                  />
                </Animated.View>
                <PressableScale onPress={handleRequest} style={styles.linkRow} haptic={false} disabled={loading}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Didn&apos;t get it? <ThemedText type="smallBold" themeColor="primary">Resend code</ThemedText>
                  </ThemedText>
                </PressableScale>
              </View>
            ) : null}

            {step === 'done' ? (
              <Animated.View entering={FadeInDown.duration(350)} style={styles.form}>
                <Button label="Back to log in" icon="arrow-forward" onPress={() => router.replace('/login')} />
              </Animated.View>
            ) : null}

            {step !== 'done' ? (
              <Animated.View entering={FadeInUp.duration(350).delay(250)}>
                <PressableScale onPress={() => router.back()} style={styles.linkRow} haptic={false}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Remembered it? <ThemedText type="smallBold" themeColor="primary">Back to log in</ThemedText>
                  </ThemedText>
                </PressableScale>
              </Animated.View>
            ) : null}
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
  form: {
    gap: Spacing.three,
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
