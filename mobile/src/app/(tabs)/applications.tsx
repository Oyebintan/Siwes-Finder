import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, listApplications, type Application } from '@/api/client';

const STATUS_COPY: Record<Application['status'], { label: string; color: ThemeColor }> = {
  Pending: { label: 'Under review', color: 'warning' },
  Accepted: { label: 'Accepted', color: 'success' },
  Rejected: { label: 'Not selected', color: 'error' },
};

export default function ApplicationsScreen() {
  const theme = useTheme();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setApplications(await listApplications());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your applications. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch on every focus so a newly submitted application shows up
  // immediately after returning from a job's detail screen.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ThemedText type="title" style={styles.headerTitle}>
          Applications
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
            data={applications}
            keyExtractor={(app) => app._id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <ThemedView style={styles.center}>
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  No applications yet. Browse opportunities and apply to see them here.
                </ThemedText>
              </ThemedView>
            }
            renderItem={({ item }) => {
              const status = STATUS_COPY[item.status];
              const companyName = item.job?.employerId?.companyName || 'Company';
              return (
                <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                  <Pressable
                    onPress={() => item.job && router.push(`/jobs/${item.job._id}`)}
                    disabled={!item.job}
                    style={styles.cardRow}
                  >
                    <ThemedView style={styles.cardHeaderText}>
                      <ThemedText type="smallBold">{item.job?.title ?? 'Opportunity no longer available'}</ThemedText>
                      {item.job ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {companyName} · {item.job.location}
                        </ThemedText>
                      ) : null}
                    </ThemedView>
                    <ThemedView type="backgroundSelected" style={styles.badge}>
                      <ThemedText type="small" themeColor={status.color}>
                        {status.label}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push(`/messages/${item._id}`)}
                    style={[styles.messageButton, { borderColor: theme.border }]}
                  >
                    <ThemedText type="small" themeColor="primary">
                      Message {companyName}
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              );
            }}
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
    paddingHorizontal: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardHeaderText: {
    flex: 1,
    gap: Spacing.half,
  },
  messageButton: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
});
