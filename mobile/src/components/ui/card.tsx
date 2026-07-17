import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PressableScale } from './pressable-scale';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Elevated surface card — soft shadow, generous radius. When `onPress` is
 * given the whole card springs on touch.
 */
export function Card({ children, onPress, style }: CardProps) {
  const theme = useTheme();
  const surface = [
    styles.card,
    {
      backgroundColor: theme.backgroundElement,
      borderColor: theme.border,
      shadowColor: '#0b1220',
    },
    style,
  ];

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={surface}>
        {children}
      </PressableScale>
    );
  }
  return <View style={surface}>{children}</View>;
}

/** Circle with a company/person initial — stand-in avatar for list rows. */
export function InitialAvatar({ name, size = 44 }: { name: string; size?: number }) {
  const theme = useTheme();
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.primarySoft },
      ]}
    >
      <Text style={{ color: theme.primary, fontFamily: FontFamily.extrabold, fontSize: size * 0.42 }} allowFontScaling={false}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
    borderWidth: Platform.select({ android: 1, default: StyleSheet.hairlineWidth }) ?? 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
