import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PressableScale } from './pressable-scale';

const COPY: Record<'student' | 'employer', string> = {
  student: 'Verify your email to apply to placements.',
  employer: 'Verify your email to post opportunities.',
};

interface VerifyEmailBannerProps {
  role: 'student' | 'employer';
}

// Nudges toward /verify-email without blocking the app -- applying to
// placements (students) and posting opportunities (employers) are gated
// server-side (see POST /api/applications, POST /api/jobs); this banner
// is the visible explanation for why those actions might get rejected.
export function VerifyEmailBanner({ role }: VerifyEmailBannerProps) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={() => router.push('/verify-email')}
      style={[styles.banner, { backgroundColor: theme.warningSoft }]}
      accessibilityRole="button"
      accessibilityLabel="Verify your email"
    >
      <Ionicons name="mail-unread-outline" size={16} color={theme.warning} />
      <ThemedText type="small" themeColor="warning" style={styles.text}>
        {COPY[role]}
      </ThemedText>
      <ThemedText type="smallBold" themeColor="warning">
        Verify
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + Spacing.half,
  },
  text: {
    flex: 1,
  },
});
