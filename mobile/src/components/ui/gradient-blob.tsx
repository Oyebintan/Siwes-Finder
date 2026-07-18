import { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

interface GradientBlobProps {
  color: string;
  size?: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Soft drifting glow orb -- decorative backdrop for gradient hero moments
 * (onboarding, login/signup, dashboard heroes). A plain low-opacity circle
 * rather than a real blur (no `expo-blur` dependency in this app yet);
 * gently drifts on a loop, matching the float/rotate vocabulary
 * `onboarding-illustration.tsx` already established.
 */
export function GradientBlob({ color, size = 220, opacity = 0.3, style }: GradientBlobProps) {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4200, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, [drift]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: drift.value * 16 },
      { translateY: drift.value * -20 },
      { scale: 1 + drift.value * 0.1 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blob,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity },
        animatedStyle,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
  },
});
