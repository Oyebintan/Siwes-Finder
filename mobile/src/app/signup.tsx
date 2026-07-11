import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';
import { ApiError, register } from '@/api/client';

type Role = 'student' | 'employer' | 'school';

const ROLES: { key: Role; label: string }[] = [
  { key: 'student', label: 'Student' },
  { key: 'employer', label: 'Company' },
  { key: 'school', label: 'School' },
];

const NAME_COPY: Record<Role, { label: string; placeholder: string }> = {
  student: { label: 'Full name', placeholder: 'Amara Okafor' },
  employer: { label: 'Company name', placeholder: 'Paystack' },
  school: { label: 'Institution name', placeholder: 'University of Lagos' },
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
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">Create your account</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            Join SIWES Finder to find and apply to verified placements.
          </ThemedText>

          <ThemedView type="backgroundElement" style={[styles.tabs, { borderColor: theme.border }]}>
            {ROLES.map((r) => {
              const active = role === r.key;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => setRole(r.key)}
                  style={[styles.tab, active && { backgroundColor: theme.primary }]}
                >
                  <ThemedText type="small" themeColor={active ? undefined : 'textSecondary'} style={active ? styles.tabTextActive : undefined}>
                    {r.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>

          {error ? (
            <ThemedView type="backgroundElement" style={[styles.errorBanner, { borderColor: theme.error }]}>
              <ThemedText themeColor="error" type="small">
                {error}
              </ThemedText>
            </ThemedView>
          ) : null}

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={nameCopy.placeholder}
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="words"
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password (min. 6 characters)"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoComplete="password-new"
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
          />

          <Pressable
            onPress={handleSignup}
            disabled={loading || !canSubmit}
            style={[styles.button, { backgroundColor: theme.primary, opacity: loading || !canSubmit ? 0.6 : 1 }]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Create account</ThemedText>}
          </Pressable>

          <Pressable onPress={() => router.replace('/login')} style={styles.linkRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Already have an account? <ThemedText type="smallBold" themeColor="primary">Log in</ThemedText>
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  subtitle: {
    marginTop: -Spacing.two,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two - Spacing.half,
    alignItems: 'center',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  errorBanner: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  linkRow: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
