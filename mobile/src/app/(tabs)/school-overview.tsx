import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, getSchoolStudents, type SchoolStudent } from '@/api/client';

export default function SchoolOverviewScreen() {
  const theme = useTheme();

  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setPendingApproval(false);
    try {
      const { students: list, school } = await getSchoolStudents();
      setStudents(list);
      setSchoolName(school);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setPendingApproval(true);
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not load your dashboard. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const stats = useMemo(() => {
    const placed = students.filter((s) => s.placedAt).length;
    const applying = students.filter((s) => !s.placedAt && s.applicationCount > 0).length;
    const totalLogs = students.reduce((sum, s) => sum + s.logbookEntries, 0);
    const departmentNames = [...new Set(students.map((s) => s.department))].sort();
    const departmentBreakdown = departmentNames
      .map((dept) => {
        const inDept = students.filter((s) => s.department === dept);
        const deptPlaced = inDept.filter((s) => s.placedAt).length;
        return {
          department: dept,
          total: inDept.length,
          placed: deptPlaced,
          placementRate: inDept.length ? Math.round((deptPlaced / inDept.length) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
    return { placed, applying, totalLogs, departmentNames, departmentBreakdown };
  }, [students]);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  if (pendingApproval) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="subtitle" style={styles.centerText}>
          Awaiting verification
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={[styles.centerText, styles.holdingCopy]}>
          Your school account is in the admin review queue. Student records unlock automatically once an
          administrator approves your institution.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.container}>
          <ThemedText type="title" style={styles.headerTitle}>
            {schoolName || 'Overview'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Students who registered with your institution name, and where they stand.
          </ThemedText>

          {error ? (
            <ThemedView type="backgroundElement" style={[styles.errorBanner, { borderColor: theme.error }]}>
              <ThemedText themeColor="error" type="small">
                {error}
              </ThemedText>
            </ThemedView>
          ) : null}

          <ThemedView style={styles.kpiGrid}>
            <Kpi label="Registered students" value={students.length} theme={theme} />
            <Kpi label="Placed" value={stats.placed} theme={theme} color={theme.success} />
            <Kpi label="Actively applying" value={stats.applying} theme={theme} color={theme.warning} />
            <Kpi label="Departments" value={stats.departmentNames.length} theme={theme} />
            <Kpi label="Logbook entries" value={stats.totalLogs} theme={theme} />
          </ThemedView>

          {stats.departmentBreakdown.length > 0 ? (
            <ThemedView style={styles.section}>
              <ThemedText type="smallBold">By department</ThemedText>
              {stats.departmentBreakdown.map((d) => (
                <ThemedView key={d.department} type="backgroundElement" style={[styles.deptRow, { borderColor: theme.border }]}>
                  <ThemedView style={styles.deptRowText}>
                    <ThemedText type="small">{d.department}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {d.placed}/{d.total} placed
                    </ThemedText>
                  </ThemedView>
                  <ThemedView type="backgroundSelected" style={styles.badge}>
                    <ThemedText type="small">{d.placementRate}%</ThemedText>
                  </ThemedView>
                </ThemedView>
              ))}
            </ThemedView>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Kpi({
  label,
  value,
  theme,
  color,
}: {
  label: string;
  value: number;
  theme: ReturnType<typeof useTheme>;
  color?: string;
}) {
  return (
    <ThemedView type="backgroundElement" style={[styles.kpiCard, { borderColor: theme.border }]}>
      <ThemedText type="title" style={[styles.kpiValue, { color: color ?? theme.text }]}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
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
    gap: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
  holdingCopy: {
    maxWidth: 320,
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
  errorBanner: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  kpiCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  kpiValue: {
    fontSize: 24,
    lineHeight: 28,
  },
  section: {
    gap: Spacing.two,
  },
  deptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  deptRowText: {
    flex: 1,
    gap: Spacing.half,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
});
