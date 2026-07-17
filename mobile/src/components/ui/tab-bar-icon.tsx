import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface TabBarIconProps {
  focused: boolean;
  focusedIcon: IconName;
  unfocusedIcon: IconName;
}

/**
 * One slot in the floating pill tab bar: the active tab sits in a filled
 * brand-color pill that springs in; inactive tabs are bare outline icons.
 */
export function TabBarIcon({ focused, focusedIcon, unfocusedIcon }: TabBarIconProps) {
  const theme = useTheme();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, { damping: 16, stiffness: 260 });
  }, [focused, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + progress.value * 0.08 }],
    backgroundColor: interpolateColor(progress.value, [0, 1], ['transparent', theme.primary]),
  }));

  return (
    <Animated.View style={[styles.pill, pillStyle]}>
      <Ionicons
        name={focused ? focusedIcon : unfocusedIcon}
        size={22}
        color={focused ? '#ffffff' : theme.textSecondary}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: 58,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
