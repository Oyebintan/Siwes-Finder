import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, getSchoolStudentDetail, type SchoolStudentDetail } from '@/api/client';

const STATUS_COLOR: Record<string, ThemeColor> = {
  Pending: 'warning',
  Accepted: 'success',
  Rejected: 'error',
};

export default function SchoolStudentDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [detail, setDetail] = useState<SchoolStudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDetail(await getSchoolStudentDetail(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this student. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  if (error || !detail) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText themeColor="error" style={styles.centerText}>
          {error || 'Student not found.'}
        </ThemedText>
      </ThemedView>
    );
  }

  const { student, applications, logbook } = detail;

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="subtitle">{student.name}</ThemedText>
        <ThemedText themeColor="textSecondary">{student.email}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {[student.courseOfStudy, student.faculty, student.level].filter(Boolean).join(' · ')}
        </ThemedText>

        {student.skills && student.skills.length > 0 ? (
          <ThemedView style={styles.chipRow}>
            {student.skills.map((s) => (
              <ThemedView key={s} type="backgroundSelected" style={styles.chip}>
                <ThemedText type="small">{s}</ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
        ) : null}

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold">Applications</ThemedText>
          {applications.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No applications yet.
            </ThemedText>
          ) : (
            applications.map((a) => (
              <ThemedView key={a._id} type="backgroundElement" style={[styles.row, { borderColor: theme.border }]}>
                <ThemedView style={styles.rowText}>
                  <ThemedText type="small">{a.job?.title ?? 'Opportunity no longer available'}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {a.employer?.companyName || a.employer?.name}
                  </ThemedText>
                </ThemedView>
                <ThemedView type="backgroundSelected" style={styles.badge}>
                  <ThemedText type="small" themeColor={STATUS_COLOR[a.status]}>
                    {a.status}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            ))
          )}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold">Logbook</ThemedText>
          {logbook.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No logbook entries yet.
            </ThemedText>
          ) : (
            logbook.map((log) => (
              <ThemedView key={log._id} type="backgroundElement" style={[styles.row, { borderColor: theme.border }]}>
                <ThemedView style={styles.rowText}>
                  <ThemedText type="small">
                    Week {log.weekNumber} · {log.dayOfWeek}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {log.activityDescription}
                  </ThemedText>
                </ThemedView>
                <ThemedView type="backgroundSelected" style={styles.badge}>
                  <ThemedText type="small" themeColor={log.isApproved ? 'success' : 'warning'}>
                    {log.isApproved ? 'Approved' : 'Pending'}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            ))
          )}
        </ThemedView>
      </ScrollView>
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
  container: {
    padding: Spacing.four,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.five,
  },
  section: {
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
});
