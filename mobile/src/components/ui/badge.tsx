import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'error';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** Tinted pill badge — soft background of the semantic color, colored text. */
export function Badge({ label, tone = 'neutral', icon }: BadgeProps) {
  const theme = useTheme();
  const palette = {
    neutral: { bg: theme.backgroundSelected, fg: theme.textSecondary },
    primary: { bg: theme.primarySoft, fg: theme.primary },
    success: { bg: theme.successSoft, fg: theme.success },
    warning: { bg: theme.warningSoft, fg: theme.warning },
    error: { bg: theme.errorSoft, fg: theme.error },
  }[tone];

  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={palette.fg} /> : null}
      <ThemedText type="small" style={[styles.text, { color: palette.fg }]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.half,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
});
