import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { Card, InitialAvatar } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { BrandRefreshControl } from '@/components/ui/refresh-control';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SkeletonList } from '@/components/ui/skeleton';
import { Spacing } from '@/constants/theme';
import { ApiError, getSchoolLogbooks, type SchoolLogbookEntry } from '@/api/client';

type StatusFilter = 'all' | 'approved' | 'pending';
const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'pending', label: 'Pending' },
];

const STAGGER_MS = 55;
const MAX_STAGGERED = 8;

export default function SchoolLogbooksScreen() {
  const [entries, setEntries] = useState<SchoolLogbookEntry[]>([]);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (statusFilter: StatusFilter, asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
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
      setRefreshing(false);
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
      <ThemedView style={styles.centerFill}>
        <EmptyState
          icon="hourglass-outline"
          title="Awaiting verification"
          message="The logbook feed unlocks once an admin approves your school account."
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScreenHeader title="Logbooks" subtitle="Every entry from your registered students" />
        <View style={styles.chipRow}>
          {STATUS_FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} active={status === f.key} onPress={() => setStatus(f.key)} />
          ))}
        </View>

        {error ? <ErrorBanner message={error} style={styles.errorBanner} /> : null}

        {loading ? (
          <SkeletonList />
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(e) => e._id}
            contentContainerStyle={styles.list}
            refreshControl={<BrandRefreshControl refreshing={refreshing} onRefresh={() => load(status, true)} />}
            ListEmptyComponent={
              <EmptyState
                icon="book-outline"
                title="No entries here"
                message="No logbook entries match this filter yet."
              />
            }
            renderItem={({ item, index }) => (
              <Animated.View
                entering={FadeInDown.duration(320).delay(Math.min(index, MAX_STAGGERED) * STAGGER_MS)}
              >
                <Card>
                  <View style={styles.cardHeader}>
                    <InitialAvatar name={item.studentName} size={40} />
                    <View style={styles.cardHeaderText}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {item.studentName}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {item.department} · Week {item.weekNumber} · {item.dayOfWeek}
                      </ThemedText>
                    </View>
                    <Badge
                      label={item.isApproved ? 'Approved' : 'Pending'}
                      tone={item.isApproved ? 'success' : 'warning'}
                      icon={item.isApproved ? 'checkmark-circle' : 'time-outline'}
                    />
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.activityDescription}
                  </ThemedText>
                </Card>
              </Animated.View>
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
  centerFill: {
    flex: 1,
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  errorBanner: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
    flexGrow: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardHeaderText: {
    flex: 1,
    gap: Spacing.half,
  },
});
