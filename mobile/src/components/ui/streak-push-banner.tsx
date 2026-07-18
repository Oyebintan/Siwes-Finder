import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PressableScale } from './pressable-scale';

const SHOW_DELAY_MS = 2000;
const AUTO_HIDE_MS = 5000;

interface StreakPushBannerProps {
  /** Current weekday streak length (see streak-card.tsx's computeWeekdayStreak). Only mount this component when there's an active, not-yet-logged-today streak to protect. */
  streak: number;
}

/**
 * A light nudge that slides in ~2s after landing on the dashboard and
 * auto-dismisses ~5s later if untouched -- reminding the student not to
 * break an active logging streak. Tapping it (or its own timeout) both
 * dismiss it; tapping additionally routes to the Logbook tab. The parent
 * decides *whether* to mount this (streak > 0 and today not yet logged);
 * this component only owns the show/hide timing.
 */
export function StreakPushBanner({ streak }: StreakPushBannerProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const hideTimer = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    return () => clearTimeout(hideTimer);
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutUp.duration(180)} style={styles.wrap}>
      <PressableScale
        onPress={() => {
          setVisible(false);
          router.push('/logbook');
        }}
        style={[styles.banner, { backgroundColor: theme.warning }]}
        accessibilityRole="button"
        accessibilityLabel={`${streak} day streak. Log today's entry to keep it going.`}
      >
        <Ionicons name="flame" size={18} color="#ffffff" />
        <ThemedText type="smallBold" style={styles.text}>
          {streak}-day streak! Log today to keep it going
        </ThemedText>
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.85)" />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.four,
    right: Spacing.four,
    zIndex: 50,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    shadowColor: '#0b1220',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  text: {
    flex: 1,
    color: '#ffffff',
  },
});
