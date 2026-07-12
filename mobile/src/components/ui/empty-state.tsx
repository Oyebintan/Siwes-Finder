import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from './button';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Friendly empty/zero state: tinted icon circle, title, copy, optional CTA. */
export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(350)} style={styles.wrap}>
      <View style={[styles.iconCircle, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name={icon} size={30} color={theme.primary} />
      </View>
      <ThemedText type="smallBold" style={styles.title}>
        {title}
      </ThemedText>
      {message ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} small variant="secondary" /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
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
    fontSize: 16,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: Spacing.two,
  },
});
