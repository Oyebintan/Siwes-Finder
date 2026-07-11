import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, getSchoolLogbooks, type SchoolLogbookEntry } from '@/api/client';

type StatusFilter = 'all' | 'approved' | 'pending';
const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'pending', label: 'Pending' },
];

export default function SchoolLogbooksScreen() {
  const theme = useTheme();

  const [entries, setEntries] = useState<SchoolLogbookEntry[]>([]);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (statusFilter: StatusFilter) => {
    setLoading(true);
    setError('');
    setPendingApproval(false);
    try {
      const { entries: list } = await getSchoolLogbooks(statusFilter === 'all' ? {} : { status: statusFilter });
      setEntries(list);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setPendingApproval(true);
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not load the logbook feed. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(status);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status])
  );

  if (pendingApproval) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          The logbook feed unlocks once an admin approves your school account.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>
            Logbooks
          </ThemedText>
          <ThemedView style={styles.chipRow}>
            {STATUS_FILTERS.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => setStatus(f.key)}
                style={[styles.chip, { borderColor: theme.border, backgroundColor: status === f.key ? theme.primary : theme.backgroundElement }]}
              >
                <ThemedText type="small" themeColor={status === f.key ? undefined : 'textSecondary'} style={status === f.key ? styles.chipTextActive : undefined}>
                  {f.label}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>
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
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(e) => e._id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <ThemedView style={styles.center}>
                <ThemedText themeColor="textSecondary">No entries match this filter.</ThemedText>
              </ThemedView>
            }
            renderItem={({ item }) => (
              <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
                <ThemedView style={styles.cardHeader}>
                  <ThemedView style={styles.cardHeaderText}>
                    <ThemedText type="smallBold">{item.studentName}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.department} · Week {item.weekNumber} · {item.dayOfWeek}
                    </ThemedText>
                  </ThemedView>
                  <ThemedView type="backgroundSelected" style={styles.badge}>
                    <ThemedText type="small" themeColor={item.isApproved ? 'success' : 'warning'}>
                      {item.isApproved ? 'Approved' : 'Pending'}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.activityDescription}
                </ThemedText>
              </ThemedView>
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  chipRow: {
    flexDirection: 'row',
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
  errorBanner: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  cardHeaderText: {
    flex: 1,
    gap: Spacing.half,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
});
