import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  ApiError,
  bulkUpdateApplications,
  listEmployerApplications,
  updateApplicationStatus,
  type EmployerApplication,
} from '@/api/client';

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
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkActing, setBulkActing] = useState(false);

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

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDecision = async (status: 'Accepted' | 'Rejected') => {
    if (selected.size === 0 || bulkActing) return;
    setBulkActing(true);
    setError('');
    try {
      const ids = Array.from(selected);
      await bulkUpdateApplications(ids, status);
      setApplications((prev) => prev.map((a) => (ids.includes(a._id) ? { ...a, status } : a)));
      setSelected(new Set());
      setSelectMode(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update selected applications. Check your connection.');
    } finally {
      setBulkActing(false);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ThemedView style={styles.headerRow}>
          <ThemedText type="title" style={styles.headerTitle}>
            Applicants
          </ThemedText>
          {applications.some((a) => a.status === 'Pending') ? (
            <Pressable
              onPress={() => {
                setSelectMode((v) => !v);
                setSelected(new Set());
              }}
              style={[styles.selectToggle, { borderColor: selectMode ? theme.primary : theme.border }]}
            >
              <ThemedText type="small" themeColor={selectMode ? 'primary' : 'textSecondary'}>
                {selectMode ? 'Cancel' : 'Select'}
              </ThemedText>
            </Pressable>
          ) : null}
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
            data={applications}
            keyExtractor={(a) => a._id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <ThemedView style={styles.center}>
                <ThemedText themeColor="textSecondary">No applicants yet.</ThemedText>
              </ThemedView>
            }
            renderItem={({ item }) => {
              const showCheckbox = selectMode && item.status === 'Pending';
              return (
              <ThemedView
                type="backgroundElement"
                style={[styles.card, { borderColor: selected.has(item._id) ? theme.primary : theme.border }]}
              >
                <Pressable
                  disabled={!showCheckbox}
                  onPress={() => toggleSelected(item._id)}
                  style={styles.cardHeader}
                >
                  {showCheckbox ? (
                    <ThemedText style={{ color: selected.has(item._id) ? theme.primary : theme.textSecondary }}>
                      {selected.has(item._id) ? '☑' : '☐'}
                    </ThemedText>
                  ) : null}
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
                </Pressable>

                {item.student?.university || item.student?.courseOfStudy ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {[item.student.courseOfStudy, item.student.university].filter(Boolean).join(' · ')}
                  </ThemedText>
                ) : null}
                <ThemedText type="small" themeColor="textSecondary">
                  {item.student?.email}
                </ThemedText>

                <Pressable
                  onPress={() => router.push(`/messages/${item._id}`)}
                  style={[styles.messageButton, { borderColor: theme.border }]}
                >
                  <ThemedText type="small" themeColor="primary">
                    Message {item.student?.name ?? 'applicant'}
                  </ThemedText>
                </Pressable>

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
              );
            }}
          />
        )}

        {selectMode && selected.size > 0 ? (
          <ThemedView type="backgroundElement" style={[styles.bulkBar, { borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {selected.size} selected
            </ThemedText>
            <ThemedView style={styles.bulkActions}>
              <Pressable
                onPress={() => handleBulkDecision('Rejected')}
                disabled={bulkActing}
                style={[styles.actionButton, styles.rejectButton, { borderColor: theme.error }]}
              >
                <ThemedText themeColor="error" type="small">
                  Reject selected
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleBulkDecision('Accepted')}
                disabled={bulkActing}
                style={[styles.actionButton, { backgroundColor: theme.primary, opacity: bulkActing ? 0.6 : 1 }]}
              >
                {bulkActing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText style={styles.acceptButtonText}>Accept selected</ThemedText>
                )}
              </Pressable>
            </ThemedView>
          </ThemedView>
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  selectToggle: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
  messageButton: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.half,
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
  bulkBar: {
    borderTopWidth: 1.5,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
