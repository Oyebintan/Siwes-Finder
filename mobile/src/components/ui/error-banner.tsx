import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ErrorBannerProps {
  message: string;
  style?: StyleProp<ViewStyle>;
}

/** Animated inline error banner — tinted, with an alert icon. */
export function ErrorBanner({ message, style }: ErrorBannerProps) {
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
});
