import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ErrorBannerProps {
  message: string;
  /** Renders a "Try again" action inside the banner. */
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Animated inline error banner — tinted, with an alert icon. */
export function ErrorBanner({ message, onRetry, style }: ErrorBannerProps) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      exiting={FadeOut.duration(150)}
      style={[styles.banner, { backgroundColor: theme.errorSoft }, style]}
      accessibilityRole="alert"
    >
      <Ionicons name="alert-circle" size={18} color={theme.error} />
      <ThemedText type="small" themeColor="error" style={styles.text}>
        {message}
      </ThemedText>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={10} accessibilityRole="button" accessibilityLabel="Try again">
          <ThemedText type="smallBold" themeColor="error" style={styles.retry}>
            Try again
          </ThemedText>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  text: {
    flex: 1,
  },
  retry: {
    textDecorationLine: 'underline',
  },
});
