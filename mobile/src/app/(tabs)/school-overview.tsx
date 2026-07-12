import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { Radius, Spacing } from '@/constants/theme';
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
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View style={styles.loadingWrap}>
            <Skeleton width="55%" height={28} />
            <View style={styles.loadingGrid}>
              <Skeleton height={90} radius={Radius.lg} width="47%" />
              <Skeleton height={90} radius={Radius.lg} width="47%" />
              <Skeleton height={90} radius={Radius.lg} width="47%" />
              <Skeleton height={90} radius={Radius.lg} width="47%" />
            </View>
            <SkeletonCard />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (pendingApproval) {
    return (
      <ThemedView style={styles.centerFill}>
        <EmptyState
          icon="hourglass-outline"
          title="Awaiting verification"
          message="Your school account is in the admin review queue. Student records unlock automatically once an administrator approves your institution."
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.container}>
          <ScreenHeader
            title={schoolName || 'Overview'}
            subtitle="Students who registered with your institution name, and where they stand"
          />

          {error ? <ErrorBanner message={error} /> : null}

          <View style={styles.kpiGrid}>
            <Kpi icon="people" label="Registered students" value={students.length} tone="primary" delay={60} />
            <Kpi icon="checkmark-done" label="Placed" value={stats.placed} tone="success" delay={120} />
            <Kpi icon="paper-plane" label="Actively applying" value={stats.applying} tone="warning" delay={180} />
            <Kpi icon="git-branch" label="Departments" value={stats.departmentNames.length} tone="primary" delay={240} />
            <Kpi icon="book" label="Logbook entries" value={stats.totalLogs} tone="primary" delay={300} />
          </View>

          {stats.departmentBreakdown.length > 0 ? (
            <Animated.View entering={FadeInDown.duration(350).delay(360)} style={styles.section}>
              <ThemedText type="smallBold">By department</ThemedText>
              {stats.departmentBreakdown.map((d) => (
                <Card key={d.department} style={styles.deptRow}>
                  <View style={styles.deptRowText}>
                    <ThemedText type="smallBold">{d.department}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {d.placed}/{d.total} placed
                    </ThemedText>
                  </View>
                  {/* Progress bar + rate: color shifts with how far along the department is. */}
                  <View style={styles.deptProgressCol}>
                    <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${d.placementRate}%`,
                            backgroundColor: d.placementRate >= 50 ? theme.success : theme.primary,
                          },
                        ]}
                      />
                    </View>
                    <Badge label={`${d.placementRate}%`} tone={d.placementRate >= 50 ? 'success' : 'primary'} />
                  </View>
                </Card>
              ))}
            </Animated.View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  tone: 'primary' | 'success' | 'warning';
  delay: number;
}) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.primarySoft, fg: theme.primary },
    success: { bg: theme.successSoft, fg: theme.success },
    warning: { bg: theme.warningSoft, fg: theme.warning },
  }[tone];

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(delay)} style={styles.kpiSlot}>
      <Card style={styles.kpiCard}>
        <View style={[styles.kpiIcon, { backgroundColor: palette.bg }]}>
          <Ionicons name={icon} size={16} color={palette.fg} />
        </View>
        <ThemedText style={styles.kpiValue}>{value}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {label}
        </ThemedText>
      </Card>
    </Animated.View>
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
  loadingWrap: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  loadingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  container: {
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  kpiSlot: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  kpiCard: {
    gap: Spacing.one,
  },
  kpiIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  kpiValue: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  section: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  deptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  deptRowText: {
    flex: 1,
    gap: Spacing.half,
  },
  deptProgressCol: {
    alignItems: 'flex-end',
    gap: Spacing.one,
    width: 96,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
