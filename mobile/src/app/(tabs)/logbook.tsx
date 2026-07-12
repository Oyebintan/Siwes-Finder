import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Field } from '@/components/ui/field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SkeletonCard } from '@/components/ui/skeleton';
import { StreakCard } from '@/components/ui/streak-card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, createLogbookEntry, listLogbookEntries, type LogbookEntry } from '@/api/client';
import { flushQueuedDrafts, getQueuedDrafts, queueDraft, type QueuedDraft } from '@/api/logbookDrafts';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

type WeekGroup = {
  weekNumber: number;
  entries: LogbookEntry[];
  drafts: QueuedDraft[];
};

export default function LogbookScreen() {
  const theme = useTheme();

  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [drafts, setDrafts] = useState<QueuedDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncNotice, setSyncNotice] = useState('');

  const [week, setWeek] = useState('1');
  const [day, setDay] = useState('Monday');
  const [activity, setActivity] = useState('');
  const [hours, setHours] = useState('8');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [entryList, draftList] = await Promise.all([listLogbookEntries(), getQueuedDrafts()]);
      setEntries(entryList);
      setDrafts(draftList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your logbook. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  const sync = useCallback(async () => {
    const { synced } = await flushQueuedDrafts();
    if (synced > 0) {
      setSyncNotice(`Synced ${synced} offline ${synced === 1 ? 'entry' : 'entries'}.`);
      await load();
    } else {
      setDrafts(await getQueuedDrafts());
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await load();
        await sync();
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) sync();
    });
    return unsubscribe;
  }, [sync]);

  const handleSubmit = async () => {
    const weekNumber = Number(week);
    const hoursWorked = Number(hours);
    if (!Number.isFinite(weekNumber) || weekNumber < 1) {
      setSubmitError('Enter a valid week number.');
      return;
    }
    if (!activity.trim()) {
      setSubmitError('Describe what you worked on.');
      return;
    }
    if (!Number.isFinite(hoursWorked) || hoursWorked < 1 || hoursWorked > 24) {
      setSubmitError('Hours worked must be between 1 and 24.');
      return;
    }

    const draft = { weekNumber, dayOfWeek: day, activityDescription: activity.trim(), hoursWorked };
    setSubmitting(true);
    setSubmitError('');
    setSyncNotice('');
    try {
      await createLogbookEntry(draft);
      setActivity('');
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        // The server explicitly rejected this entry (e.g. no accepted
        // placement yet) -- surfacing it beats silently queuing something
        // that will never sync.
        setSubmitError(err.message);
      } else {
        // Not an ApiError means the request never reached the server (no
        // connection) -- queue it instead of losing the entry.
        await queueDraft(draft);
        setDrafts(await getQueuedDrafts());
        setActivity('');
        setSyncNotice('Saved offline — will sync when you\'re back online.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const weekGroups = useMemo<WeekGroup[]>(() => {
    const byWeek = new Map<number, WeekGroup>();
    const get = (weekNumber: number) => {
      let group = byWeek.get(weekNumber);
      if (!group) {
        group = { weekNumber, entries: [], drafts: [] };
        byWeek.set(weekNumber, group);
      }
      return group;
    };
    entries.forEach((e) => get(e.weekNumber).entries.push(e));
    drafts.forEach((d) => get(d.weekNumber).drafts.push(d));
    return Array.from(byWeek.values()).sort((a, b) => b.weekNumber - a.weekNumber);
  }, [entries, drafts]);

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <ScreenHeader title="e-Logbook" subtitle="Your daily record, synced to your school" />

          {!loading && entries.length > 0 ? (
            <View style={styles.streakWrap}>
              <StreakCard entries={entries} />
            </View>
          ) : null}

          <Animated.View entering={FadeInDown.duration(350).delay(80)}>
            <Card style={styles.form}>
              {submitError ? <ErrorBanner message={submitError} /> : null}
              {syncNotice ? (
                <View style={[styles.notice, { backgroundColor: theme.successSoft }]}>
                  <Ionicons name="cloud-done-outline" size={16} color={theme.success} />
                  <ThemedText themeColor="success" type="small">
                    {syncNotice}
                  </ThemedText>
                </View>
              ) : null}

              <View style={styles.row}>
                <View style={styles.flexField}>
                  <Field label="Week" value={week} onChangeText={setWeek} keyboardType="number-pad" />
                </View>
                <View style={styles.flexField}>
                  <Field label="Hours" value={hours} onChangeText={setHours} keyboardType="number-pad" />
                </View>
              </View>

              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.dayLabel}>
                Day
              </ThemedText>
              <View style={styles.chipRow}>
                {DAYS.map((d) => (
                  <Chip key={d} label={d.slice(0, 3)} active={day === d} onPress={() => setDay(d)} />
                ))}
              </View>

              <Field
                label="What did you work on?"
                value={activity}
                onChangeText={setActivity}
                placeholder="Describe today's tasks…"
                multiline
                numberOfLines={3}
                style={styles.textArea}
              />

              <Button label="Add entry" icon="add-circle-outline" onPress={handleSubmit} loading={submitting} />
            </Card>
          </Animated.View>

          {error ? <ErrorBanner message={error} /> : null}

          {loading ? (
            <View style={styles.skeletons}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : weekGroups.length === 0 ? (
            <EmptyState
              icon="book-outline"
              title="No entries yet"
              message="Add your first daily entry above — 20 seconds a day keeps your logbook ready for sign-off."
            />
          ) : (
            weekGroups.map((group) => (
              <View key={group.weekNumber} style={styles.weekGroup}>
                <View style={styles.weekHeader}>
                  <View style={[styles.weekDot, { backgroundColor: theme.primary }]} />
                  <ThemedText type="smallBold">Week {group.weekNumber}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    · {group.entries.length + group.drafts.length} {group.entries.length + group.drafts.length === 1 ? 'entry' : 'entries'}
                  </ThemedText>
                </View>
                {group.drafts.map((d) => (
                  <Card key={d.localId} style={[styles.entryCard, styles.pendingCard, { borderColor: theme.warning }]}>
                    <View style={styles.entryHeader}>
                      <ThemedText type="smallBold">{d.dayOfWeek}</ThemedText>
                      <Badge label="Pending sync" tone="warning" icon="cloud-offline-outline" />
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {d.activityDescription}
                    </ThemedText>
                    <Badge label={`${d.hoursWorked}h logged`} tone="neutral" icon="time-outline" />
                  </Card>
                ))}
                {group.entries.map((e) => (
                  <Card key={e._id} style={styles.entryCard}>
                    <View style={styles.entryHeader}>
                      <ThemedText type="smallBold">{e.dayOfWeek}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {e.activityDescription}
                    </ThemedText>
                    <Badge label={`${e.hoursWorked}h logged`} tone="neutral" icon="time-outline" />
                  </Card>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  streakWrap: {
    paddingHorizontal: Spacing.four,
  },
  form: {
    marginHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flexField: {
    flex: 1,
  },
  dayLabel: {
    marginBottom: -Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  skeletons: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  weekGroup: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  weekDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entryCard: {
    gap: Spacing.two,
  },
  pendingCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
