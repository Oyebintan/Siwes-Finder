import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, approveLogbookEntry, listEmployerLogbookEntries, type EmployerLogbookEntry } from '@/api/client';

export default function EmployerLogbookScreen() {
  const theme = useTheme();

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
        <ThemedText type="title" style={styles.headerTitle}>
          Logbook approvals
        </ThemedText>

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
                <ThemedText themeColor="textSecondary">No logbook entries from your interns yet.</ThemedText>
              </ThemedView>
            }
            renderItem={({ item }) => (
              <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
                <ThemedView style={styles.cardHeader}>
                  <ThemedView style={styles.cardHeaderText}>
                    <ThemedText type="smallBold">{item.studentId?.name ?? 'Unknown student'}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Week {item.weekNumber} · {item.dayOfWeek}
                    </ThemedText>
                  </ThemedView>
                  {item.isApproved ? (
                    <ThemedView type="backgroundSelected" style={styles.badge}>
                      <ThemedText type="small" themeColor="success">
                        Approved
                      </ThemedText>
                    </ThemedView>
                  ) : null}
                </ThemedView>

                <ThemedText type="small" themeColor="textSecondary">
                  {item.activityDescription}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.hoursWorked}h logged
                </ThemedText>

                {!item.isApproved ? (
                  <Pressable
                    onPress={() => handleApprove(item._id)}
                    disabled={approvingId === item._id}
                    style={[styles.approveButton, { backgroundColor: theme.primary, opacity: approvingId === item._id ? 0.6 : 1 }]}
                  >
                    {approvingId === item._id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <ThemedText style={styles.approveButtonText}>Approve entry</ThemedText>
                    )}
                  </Pressable>
                ) : null}
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
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  errorBanner: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
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
  approveButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  approveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
