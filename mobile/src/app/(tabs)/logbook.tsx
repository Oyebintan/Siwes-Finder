import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
          <ThemedText type="title" style={styles.headerTitle}>
            e-Logbook
          </ThemedText>

          <ThemedView type="backgroundElement" style={[styles.form, { borderColor: theme.border }]}>
            {submitError ? (
              <ThemedText themeColor="error" type="small">
                {submitError}
              </ThemedText>
            ) : null}
            {syncNotice ? (
              <ThemedText themeColor="success" type="small">
                {syncNotice}
              </ThemedText>
            ) : null}

            <ThemedView style={styles.row}>
              <ThemedView style={styles.weekField}>
                <ThemedText type="small" themeColor="textSecondary">
                  Week
                </ThemedText>
                <TextInput
                  value={week}
                  onChangeText={setWeek}
                  keyboardType="number-pad"
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                />
              </ThemedView>
              <ThemedView style={styles.hoursField}>
                <ThemedText type="small" themeColor="textSecondary">
                  Hours
                </ThemedText>
                <TextInput
                  value={hours}
                  onChangeText={setHours}
                  keyboardType="number-pad"
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                />
              </ThemedView>
            </ThemedView>

            <ThemedText type="small" themeColor="textSecondary">
              Day
            </ThemedText>
            <ThemedView style={styles.chipRow}>
              {DAYS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDay(d)}
                  style={[styles.chip, { borderColor: theme.border, backgroundColor: day === d ? theme.primary : theme.background }]}
                >
                  <ThemedText type="small" themeColor={day === d ? undefined : 'textSecondary'} style={day === d ? styles.chipTextActive : undefined}>
                    {d}
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>

            <ThemedText type="small" themeColor="textSecondary">
              What did you work on?
            </ThemedText>
            <TextInput
              value={activity}
              onChangeText={setActivity}
              placeholder="Describe today's tasks…"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            />

            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.submitButton, { backgroundColor: theme.primary, opacity: submitting ? 0.6 : 1 }]}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.submitButtonText}>Add entry</ThemedText>}
            </Pressable>
          </ThemedView>

          {error ? (
            <ThemedView type="backgroundElement" style={[styles.errorBanner, { borderColor: theme.error }]}>
              <ThemedText themeColor="error" type="small">
                {error}
              </ThemedText>
            </ThemedView>
          ) : null}

          {loading ? (
            <ThemedView style={styles.center}>
              <ActivityIndicator color={theme.primary} />
            </ThemedView>
          ) : weekGroups.length === 0 ? (
            <ThemedView style={styles.center}>
              <ThemedText themeColor="textSecondary">No entries yet. Add your first one above.</ThemedText>
            </ThemedView>
          ) : (
            weekGroups.map((group) => (
              <ThemedView key={group.weekNumber} style={styles.weekGroup}>
                <ThemedText type="smallBold">Week {group.weekNumber}</ThemedText>
                {group.drafts.map((d) => (
                  <ThemedView key={d.localId} type="backgroundElement" style={[styles.entryCard, styles.pendingCard, { borderColor: theme.warning }]}>
                    <ThemedView style={styles.entryHeader}>
                      <ThemedText type="small">{d.dayOfWeek}</ThemedText>
                      <ThemedView type="backgroundSelected" style={styles.badge}>
                        <ThemedText type="small" themeColor="warning">
                          Pending sync
                        </ThemedText>
                      </ThemedView>
                    </ThemedView>
                    <ThemedText type="small" themeColor="textSecondary">
                      {d.activityDescription}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {d.hoursWorked}h logged
                    </ThemedText>
                  </ThemedView>
                ))}
                {group.entries.map((e) => (
                  <ThemedView key={e._id} type="backgroundElement" style={[styles.entryCard, { borderColor: theme.border }]}>
                    <ThemedView style={styles.entryHeader}>
                      <ThemedText type="small">{e.dayOfWeek}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </ThemedText>
                    </ThemedView>
                    <ThemedText type="small" themeColor="textSecondary">
                      {e.activityDescription}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {e.hoursWorked}h logged
                    </ThemedText>
                  </ThemedView>
                ))}
              </ThemedView>
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
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  form: {
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  weekField: {
    flex: 1,
    gap: Spacing.half,
  },
  hoursField: {
    flex: 1,
    gap: Spacing.half,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    borderWidth: 1.5,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  submitButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  errorBanner: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  weekGroup: {
    gap: Spacing.two,
  },
  entryCard: {
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  pendingCard: {
    borderStyle: 'dashed',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
});
