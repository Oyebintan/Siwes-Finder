import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Card } from './card';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F'] as const;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface StreakInput {
  date: string;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Consecutive weekdays with at least one entry, walking back from today
 * (today itself may still be unlogged without breaking the streak).
 * Weekends never break or extend a streak — mirrors the backend's
 * streak-reminder cron, which only nags about weekdays.
 */
export function computeWeekdayStreak(entries: StreakInput[], now = new Date()): number {
  const loggedDays = new Set(entries.map((e) => startOfDay(new Date(e.date))));
  let streak = 0;
  let cursor = startOfDay(now);

  // Today counts if logged, but an unlogged today doesn't end the streak.
  const todayDow = new Date(cursor).getDay();
  if (todayDow >= 1 && todayDow <= 5) {
    if (loggedDays.has(cursor)) streak += 1;
  }
  cursor -= MS_PER_DAY;

  for (;;) {
    const dow = new Date(cursor).getDay();
    if (dow === 0 || dow === 6) {
      cursor -= MS_PER_DAY;
      continue;
    }
    if (!loggedDays.has(cursor)) break;
    streak += 1;
    cursor -= MS_PER_DAY;
  }
  return streak;
}

/** Which of this calendar week's Mon-Fri already have an entry. */
export function loggedThisWeek(entries: StreakInput[], now = new Date()): boolean[] {
  const today = startOfDay(now);
  const dow = new Date(today).getDay(); // 0 Sun .. 6 Sat
  const monday = today - ((dow + 6) % 7) * MS_PER_DAY;
  const loggedDays = new Set(entries.map((e) => startOfDay(new Date(e.date))));
  return WEEKDAYS.map((_, i) => loggedDays.has(monday + i * MS_PER_DAY));
}

/**
 * "This week" habit strip at the top of the logbook: five day dots (filled
 * when logged) plus a 🔥 streak counter.
 */
export function StreakCard({ entries }: { entries: StreakInput[] }) {
  const theme = useTheme();
  const week = loggedThisWeek(entries);
  const streak = computeWeekdayStreak(entries);
  const todayIndex = (new Date().getDay() + 6) % 7; // 0=Mon .. 6=Sun

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(40)}>
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <ThemedText type="smallBold">This week</ThemedText>
          <View style={[styles.streakPill, { backgroundColor: streak > 0 ? theme.warningSoft : theme.backgroundSelected }]}>
            <Ionicons name="flame" size={13} color={streak > 0 ? theme.warning : theme.textSecondary} />
            <ThemedText
              type="small"
              style={styles.streakText}
              themeColor={streak > 0 ? 'warning' : 'textSecondary'}
            >
              {streak} day{streak === 1 ? '' : 's'}
            </ThemedText>
          </View>
        </View>
        <View style={styles.dotsRow}>
          {week.map((logged, i) => {
            const isToday = i === todayIndex;
            return (
              <View key={WEEKDAYS[i]} style={styles.dayCol}>
                <View
                  style={[
                    styles.dot,
                    logged
                      ? { backgroundColor: theme.success }
                      : { backgroundColor: theme.backgroundSelected },
                    isToday && !logged ? { borderWidth: 1.5, borderColor: theme.primary } : null,
                  ]}
                >
                  {logged ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
                </View>
                <ThemedText
                  type="small"
                  themeColor={isToday ? 'primary' : 'textSecondary'}
                  style={isToday ? styles.todayInitial : styles.dayInitial}
                >
                  {DAY_INITIALS[i]}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.half,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
  },
  streakText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
  },
  dayCol: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInitial: {
    fontSize: 11,
  },
  todayInitial: {
    fontSize: 11,
    fontWeight: '800',
  },
});
