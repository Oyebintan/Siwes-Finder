import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming, Easing } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

import { FontFamily } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface MatchRingProps {
  /** 0-100 */
  score: number;
  size?: number;
  /** Overrides the default (backgroundSelected) track color -- e.g. a translucent white when the ring sits on a gradient hero. */
  trackColor?: string;
  /** Overrides the default (success at 70+, else brand primary) ring/label color. */
  valueColor?: string;
}

/**
 * Circular gauge — the ring sweeps from empty to the score over ~900ms on
 * mount. Green at 70+, brand blue below, unless overridden. Originally
 * built for the job match score; also used for the school overview's
 * placement-rate gauge.
 */
export function MatchRing({ score, size = 64, trackColor, valueColor }: MatchRingProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, score));
  const strokeWidth = size * 0.11;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = valueColor ?? (clamped >= 70 ? theme.success : theme.primary);
  const track = trackColor ?? theme.backgroundSelected;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      150,
      withTiming(clamped / 100, { duration: 900, easing: Easing.out(Easing.cubic) })
    );
  }, [progress, clamped]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityLabel={`${clamped}% skill match`}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.label}>
        <ThemedText style={[styles.value, { color, fontSize: size * 0.26 }]} allowFontScaling={false}>
          {clamped}%
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: FontFamily.extrabold,
    letterSpacing: -0.3,
  },
});
