import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, LinearTransition } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Field } from '@/components/ui/field';
import { GoogleSignInButton } from '@/components/ui/google-signin-button';
import { OrDivider } from '@/components/ui/or-divider';
import { PressableScale } from '@/components/ui/pressable-scale';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';
import { ApiError, register, type SessionUser } from '@/api/client';
import { isGoogleSignInConfigured } from '@/api/googleAuth';

type Role = 'student' | 'employer' | 'school';

const ROLES: { key: Role; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'student', label: 'Student', icon: 'school-outline' },
  { key: 'employer', label: 'Company', icon: 'business-outline' },
  { key: 'school', label: 'School', icon: 'library-outline' },
];

const NAME_COPY: Record<Role, { label: string; placeholder: string; icon: keyof typeof Ionicons.glyphMap }> = {
  student: { label: 'Full name', placeholder: 'Amara Okafor', icon: 'person-outline' },
  employer: { label: 'Company name', placeholder: 'Paystack', icon: 'business-outline' },
  school: { label: 'Institution name', placeholder: 'University of Lagos', icon: 'library-outline' },
};

export default function SignupScreen() {
  const theme = useTheme();
  const { login } = useAuth();

  const [role, setRole] = useState<Role>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nameCopy = NAME_COPY[role];
  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && password.length >= 6;

  const handleSignup = async () => {
    setError('');
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, role);
      // Mirrors the web's auto-login-after-register flow.
      const sessionUser = await login(email.trim(), password);
      // A fresh signup is always unverified; confirming ownership of the
      // email comes before anything else, same as the web flow.
      if (!sessionUser.emailVerified) {
        router.replace('/verify-email');
      } else {
        // Only students get the academic-details wizard right after
        // signup, same as the web (employer/school go straight to their
        // dashboard -- their onboarding is company/institution
        // verification, handled separately on the website).
        router.replace(sessionUser.role === 'student' ? '/profile-setup' : '/');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // The role tabs above don't apply to Google sign-in (mirrors the web:
  // the Google button always lands as 'unassigned', same as any first-time
  // Google sign-in) -- route-picker decides student vs. employer instead.
  const handleGoogleSuccess = (sessionUser: SessionUser) => {
    router.replace(sessionUser.role === 'unassigned' ? '/role-picker' : '/');
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
              <BrandLogo size={64} />
              <View style={styles.heroText}>
                <ThemedText style={styles.title}>Create your account</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
                  Verified placements, applications, and your e-logbook — in one place.
                </ThemedText>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <View style={[styles.tabs, { backgroundColor: theme.backgroundSelected }]}>
                {ROLES.map((r) => {
                  const active = role === r.key;
                  return (
                    <PressableScale
                      key={r.key}
                      onPress={() => setRole(r.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={styles.tabSlot}
                    >
                      {active ? (
                        <Animated.View
                          layout={LinearTransition.springify().damping(18)}
                          style={[styles.tabActive, { backgroundColor: theme.backgroundElement, shadowColor: '#0b1220' }]}
                        />
                      ) : null}
                      <View style={styles.tabContent}>
                        <Ionicons name={r.icon} size={15} color={active ? theme.primary : theme.textSecondary} />
                        <ThemedText type="small" themeColor={active ? 'primary' : 'textSecondary'} style={active && styles.tabTextActive}>
                          {r.label}
                        </ThemedText>
                      </View>
                    </PressableScale>
                  );
                })}
              </View>
            </Animated.View>

            <View style={styles.form}>
              {error ? <ErrorBanner message={error} /> : null}

              <Animated.View entering={FadeInDown.duration(400).delay(160)}>
                <Field
                  label={nameCopy.label}
                  icon={nameCopy.icon}
                  value={name}
                  onChangeText={setName}
                  placeholder={nameCopy.placeholder}
                  autoCapitalize="words"
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(230)}>
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

              <Animated.View entering={FadeInDown.duration(400).delay(300)}>
                <Field
                  label="Password"
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  password
                  autoComplete="password-new"
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(370)}>
                <Button
                  label="Create account"
                  icon="arrow-forward"
                  onPress={handleSignup}
                  loading={loading}
                  disabled={!canSubmit}
                />
              </Animated.View>

              {isGoogleSignInConfigured() ? (
                <Animated.View entering={FadeInDown.duration(400).delay(410)} style={styles.googleBlock}>
                  <OrDivider />
                  <GoogleSignInButton onError={setError} onSuccess={handleGoogleSuccess} />
                </Animated.View>
              ) : null}
            </View>

            <Animated.View entering={FadeInUp.duration(400).delay(470)}>
              <PressableScale onPress={() => router.replace('/login')} style={styles.linkRow} haptic={false}>
                <ThemedText type="small" themeColor="textSecondary">
                  Already have an account? <ThemedText type="smallBold" themeColor="primary">Log in</ThemedText>
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
    gap: Spacing.four,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  heroText: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: FontFamily.extrabold,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 300,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: Spacing.one,
    gap: Spacing.one,
  },
  tabSlot: {
    flex: 1,
  },
  tabActive: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.md - Spacing.one,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two + Spacing.half,
  },
  tabTextActive: {
    fontFamily: FontFamily.bold,
  },
  form: {
    gap: Spacing.three,
  },
  googleBlock: {
    gap: Spacing.three,
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
