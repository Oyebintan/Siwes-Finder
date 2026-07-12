import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESSED_SCALE = 0.97;
const SPRING = { damping: 18, stiffness: 320 } as const;

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Fire a light haptic tick on press-in (default true when onPress is set). */
  haptic?: boolean;
};

/**
 * Pressable that springs down slightly while held — the baseline "everything
 * responds to touch" feel. Runs on the UI thread via Reanimated.
 */
export function PressableScale({ style, haptic = true, onPressIn, onPressOut, disabled, ...rest }: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // Writing to a Reanimated shared value from an event handler is the
  // library's intended API -- it isn't React state, so the react-hooks
  // immutability rule doesn't apply here.
  const handlePressIn: NonNullable<PressableProps['onPressIn']> = (event) => {
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSpring(PRESSED_SCALE, SPRING);
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPressIn?.(event);
  };

  const handlePressOut: NonNullable<PressableProps['onPressOut']> = (event) => {
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSpring(1, SPRING);
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
    />
  );
}
