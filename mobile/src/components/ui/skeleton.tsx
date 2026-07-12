import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}

/** A pulsing placeholder block. Compose several into a skeleton card. */
export function Skeleton({ width = '100%', height = 16, radius = Radius.sm }: SkeletonProps) {
  const theme = useTheme();
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 650 }), withTiming(0.45, { duration: 650 })),
      -1
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: theme.backgroundSelected }, style]}
    />
  );
}

/** Skeleton shaped like the app's standard list card (avatar + two lines + pills). */
export function SkeletonCard() {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.row}>
        <Skeleton width={44} height={44} radius={22} />
        <View style={styles.lines}>
          <Skeleton width="72%" height={14} />
          <Skeleton width="48%" height={12} />
        </View>
      </View>
      <View style={styles.pills}>
        <Skeleton width={72} height={22} radius={Radius.full} />
        <Skeleton width={90} height={22} radius={Radius.full} />
      </View>
    </View>
  );
}

/** A column of skeleton cards for full-screen list loading. */
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  lines: {
    flex: 1,
    gap: Spacing.two,
  },
  pills: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
