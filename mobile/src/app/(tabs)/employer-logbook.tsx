import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, InitialAvatar } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SkeletonList } from '@/components/ui/skeleton';
import { Spacing } from '@/constants/theme';
import { ApiError, approveLogbookEntry, listEmployerLogbookEntries, type EmployerLogbookEntry } from '@/api/client';

const STAGGER_MS = 55;
const MAX_STAGGERED = 8;

export default function EmployerLogbookScreen() {
  const [entries, setEntries] = useState<EmployerLogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setEntries(await listEmployerLogbookEntries());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load logbook entries. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await approveLogbookEntry(id);
      setEntries((prev) => prev.map((e) => (e._id === id ? { ...e, isApproved: true } : e)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not approve this entry. Check your connection.');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScreenHeader title="Logbook approvals" subtitle="Sign off your interns' daily entries" />

        {error ? <ErrorBanner message={error} style={styles.errorBanner} /> : null}

        {loading ? (
          <SkeletonList />
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(e) => e._id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <EmptyState
                icon="book-outline"
                title="No entries yet"
                message="Logbook entries from your interns will appear here for sign-off."
              />
            }
            renderItem={({ item, index }) => (
              <Animated.View
                entering={FadeInDown.duration(320).delay(Math.min(index, MAX_STAGGERED) * STAGGER_MS)}
              >
                <Card>
                  <View style={styles.cardHeader}>
                    <InitialAvatar name={item.studentId?.name ?? '?'} />
                    <View style={styles.cardHeaderText}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {item.studentId?.name ?? 'Unknown student'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Week {item.weekNumber} · {item.dayOfWeek}
                      </ThemedText>
                    </View>
                    {item.isApproved ? <Badge label="Approved" tone="success" icon="checkmark-circle" /> : null}
                  </View>

                  <ThemedText type="small" themeColor="textSecondary">
                    {item.activityDescription}
                  </ThemedText>
                  <Badge label={`${item.hoursWorked}h logged`} tone="neutral" icon="time-outline" />

                  {!item.isApproved ? (
                    <Button
                      label="Approve entry"
                      icon="checkmark-circle-outline"
                      small
                      onPress={() => handleApprove(item._id)}
                      loading={approvingId === item._id}
                      style={styles.approveButton}
                    />
                  ) : null}
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
  approveButton: {
    marginTop: Spacing.one,
  },
});
