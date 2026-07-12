import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Field } from '@/components/ui/field';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/api/AuthContext';
import { ApiError } from '@/api/client';

export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/');
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
            <Animated.View entering={FadeInDown.duration(450)} style={styles.hero}>
              <BrandLogo size={76} withWordmark />
              <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
                Welcome back — pick up your placement journey.
              </ThemedText>
            </Animated.View>

            <View style={styles.form}>
              {error ? <ErrorBanner message={error} /> : null}

              <Animated.View entering={FadeInDown.duration(400).delay(120)}>
                <Field
                  label="Email"
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@school.edu.ng"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                <Field
                  label="Password"
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  password
                  autoComplete="password"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(280)}>
                <Button
                  label="Log in"
                  icon="arrow-forward"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={!email || !password}
                />
              </Animated.View>
            </View>

            <Animated.View entering={FadeInUp.duration(400).delay(400)}>
              <PressableScale onPress={() => router.replace('/signup')} style={styles.linkRow} haptic={false}>
                <ThemedText type="small" themeColor="textSecondary">
                  New here? <ThemedText type="smallBold" themeColor="primary">Create an account</ThemedText>
                </ThemedText>
              </PressableScale>
            </Animated.View>
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
    gap: Spacing.five,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  tagline: {
    textAlign: 'center',
  },
  form: {
    gap: Spacing.three,
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
