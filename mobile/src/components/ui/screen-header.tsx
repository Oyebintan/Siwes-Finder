import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Spacing } from '@/constants/theme';

interface ScreenHeaderProps {
  title: string;
  /** Small line above the title (e.g. a greeting). */
  eyebrow?: string;
  subtitle?: string;
  /** Slot rendered on the right edge, vertically centered with the title. */
  right?: ReactNode;
}

/** Large animated screen title — every tab screen opens with one of these. */
export function ScreenHeader({ title, eyebrow, subtitle, right }: ScreenHeaderProps) {
  return (
    <Animated.View entering={FadeInDown.duration(320)} style={styles.wrap}>
      <View style={styles.textCol}>
        {eyebrow ? (
          <ThemedText type="small" themeColor="textSecondary">
            {eyebrow}
          </ThemedText>
        ) : null}
        <ThemedText style={styles.title}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right ? <View>{right}</View> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  textCol: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: FontFamily.extrabold,
    letterSpacing: -0.5,
  },
});
