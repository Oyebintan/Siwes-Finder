import { StyleSheet } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Rotated bordered "APPROVED" stamp -- a livelier stand-in for the plain
 * success Badge on a logbook entry's sign-off, matching the redesign
 * prototype's stamp visual. Pops in with a spring on mount (i.e. the
 * moment an entry's `isApproved` flips true), pinned to the card's
 * top-right corner -- the card itself must stay `position: relative`
 * (the default for a View) and not clip overflow.
 */
export function ApprovalStamp() {
  const theme = useTheme();
  return (
    <Animated.View
      entering={ZoomIn.springify().damping(11)}
      style={[styles.stamp, { borderColor: theme.success, backgroundColor: theme.successSoft }]}
    >
      <ThemedText type="smallBold" themeColor="success" style={styles.text}>
        APPROVED
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    position: 'absolute',
    // Peeks out over the card's top-right corner rather than sitting
    // inside the content flow, so it never collides with the header row's
    // name/date text underneath.
    top: -Spacing.two,
    right: -Spacing.one,
    borderWidth: 2,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    transform: [{ rotate: '-8deg' }],
    zIndex: 1,
    elevation: 3,
  },
  text: {
    letterSpacing: 1,
    fontFamily: FontFamily.extrabold,
  },
});
