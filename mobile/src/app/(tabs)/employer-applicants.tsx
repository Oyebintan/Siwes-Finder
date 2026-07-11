import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, listEmployerApplications, updateApplicationStatus, type EmployerApplication } from '@/api/client';

const STATUS_COLOR: Record<EmployerApplication['status'], ThemeColor> = {
  Pending: 'warning',
  Accepted: 'success',
  Rejected: 'error',
};

export default function EmployerApplicantsScreen() {
  const theme = useTheme();

  const [applications, setApplications] = useState<EmployerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setApplications(await listEmployerApplications());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load applicants. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDecision = async (id: string, status: 'Accepted' | 'Rejected') => {
    setActioningId(id);
    try {
      await updateApplicationStatus(id, status);
      setApplications((prev) => prev.map((a) => (a._id === id ? { ...a, status } : a)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this application. Check your connection.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ThemedText type="title" style={styles.headerTitle}>
          Applicants
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
            keyExtractor={(a) => a._id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <ThemedView style={styles.center}>
                <ThemedText themeColor="textSecondary">No applicants yet.</ThemedText>
              </ThemedView>
            }
            renderItem={({ item }) => (
              <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
                <ThemedView style={styles.cardHeader}>
                  <ThemedView style={styles.cardHeaderText}>
                    <ThemedText type="smallBold">{item.student?.name ?? 'Unknown applicant'}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.job?.title ?? 'Opportunity no longer available'}
                    </ThemedText>
                  </ThemedView>
                  <ThemedView type="backgroundSelected" style={styles.badge}>
                    <ThemedText type="small" themeColor={STATUS_COLOR[item.status]}>
                      {item.status}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>

                {item.student?.university || item.student?.courseOfStudy ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {[item.student.courseOfStudy, item.student.university].filter(Boolean).join(' · ')}
                  </ThemedText>
                ) : null}
                <ThemedText type="small" themeColor="textSecondary">
                  {item.student?.email}
                </ThemedText>

                {item.status === 'Pending' ? (
                  <ThemedView style={styles.actionRow}>
                    <Pressable
                      onPress={() => handleDecision(item._id, 'Rejected')}
                      disabled={actioningId === item._id}
                      style={[styles.actionButton, styles.rejectButton, { borderColor: theme.error }]}
                    >
                      <ThemedText themeColor="error" type="small">
                        Reject
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDecision(item._id, 'Accepted')}
                      disabled={actioningId === item._id}
                      style={[styles.actionButton, { backgroundColor: theme.primary, opacity: actioningId === item._id ? 0.6 : 1 }]}
                    >
                      {actioningId === item._id ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <ThemedText style={styles.acceptButtonText}>Accept</ThemedText>
                      )}
                    </Pressable>
                  </ThemedView>
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
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  actionButton: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  rejectButton: {
    borderWidth: 1.5,
  },
  acceptButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
