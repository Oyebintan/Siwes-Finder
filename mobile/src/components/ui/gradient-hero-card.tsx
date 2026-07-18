import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { DEFAULT_GRADIENT_MOOD, GradientMoods, Radius, Spacing, type GradientMood } from '@/constants/theme';
import { GradientBlob } from './gradient-blob';

interface GradientHeroCardProps {
  children: ReactNode;
  mood?: GradientMood;
  /** Soft drifting glow blob behind the content, top-right. On by default. */
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shared brand-gradient hero surface -- the dashboard/account/profile
 * "hero card" pattern (gradient fill, white text, optional drifting glow
 * blob) that was previously duplicated per screen. Renders children
 * directly (no forced internal layout), so each screen keeps control of
 * its own hero content/spacing.
 */
export function GradientHeroCard({ children, mood = DEFAULT_GRADIENT_MOOD, glow = true, style }: GradientHeroCardProps) {
  const { start, end } = GradientMoods[mood];
  return (
    <LinearGradient colors={[start, end]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, style]}>
      {glow ? <GradientBlob color="#ffffff" size={200} opacity={0.14} style={styles.glow} /> : null}
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    overflow: 'hidden',
  },
  glow: {
    top: -60,
    right: -50,
  },
});
