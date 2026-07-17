import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card, InitialAvatar } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { ApiError, getSchoolStudentDetail, type SchoolStudentDetail } from '@/api/client';

const STATUS_TONE: Record<string, BadgeTone> = {
  Pending: 'warning',
  Accepted: 'success',
  Rejected: 'error',
};

export default function SchoolStudentDetailScreen() {
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
      <ThemedView style={styles.loadingWrap}>
        <View style={styles.loadingHeader}>
          <Skeleton width={56} height={56} radius={28} />
          <View style={styles.loadingLines}>
            <Skeleton width="70%" height={18} />
            <Skeleton width="50%" height={13} />
          </View>
        </View>
        <Skeleton height={110} radius={Radius.lg} />
        <Skeleton height={110} radius={Radius.lg} />
      </ThemedView>
    );
  }

  if (error || !detail) {
    return (
      <ThemedView style={styles.centerFill}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load this student"
          message={error || 'Student not found.'}
          actionLabel="Try again"
          onAction={load}
        />
      </ThemedView>
    );
  }

  const { student, applications, logbook } = detail;

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <Animated.View entering={FadeInDown.duration(320)} style={styles.headerRow}>
          <InitialAvatar name={student.name} size={56} />
          <View style={styles.headerText}>
            <ThemedText style={styles.name}>{student.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {student.email}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {[student.courseOfStudy, student.faculty, student.level].filter(Boolean).join(' · ')}
            </ThemedText>
          </View>
        </Animated.View>

        {student.skills && student.skills.length > 0 ? (
          <Animated.View entering={FadeInDown.duration(320).delay(60)} style={styles.chipRow}>
            {student.skills.map((s) => (
              <Badge key={s} label={s} tone="primary" />
            ))}
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.duration(320).delay(120)} style={styles.section}>
          <ThemedText type="smallBold">Applications</ThemedText>
          {applications.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No applications yet.
            </ThemedText>
          ) : (
            applications.map((a) => (
              <Card key={a._id} style={styles.row}>
                <View style={styles.rowText}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {a.job?.title ?? 'Opportunity no longer available'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {a.employer?.companyName || a.employer?.name}
                  </ThemedText>
                </View>
                <Badge label={a.status} tone={STATUS_TONE[a.status] ?? 'neutral'} />
              </Card>
            ))
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(320).delay(180)} style={styles.section}>
          <ThemedText type="smallBold">Logbook</ThemedText>
          {logbook.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No logbook entries yet.
            </ThemedText>
          ) : (
            logbook.map((log) => (
              <Card key={log._id} style={styles.row}>
                <View style={styles.rowText}>
                  <ThemedText type="smallBold">
                    Week {log.weekNumber} · {log.dayOfWeek}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {log.activityDescription}
                  </ThemedText>
                </View>
                <Badge
                  label={log.isApproved ? 'Approved' : 'Pending'}
                  tone={log.isApproved ? 'success' : 'warning'}
                  icon={log.isApproved ? 'checkmark-circle' : 'time-outline'}
                />
              </Card>
            ))
          )}
        </Animated.View>
      </ScrollView>
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
  loadingWrap: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  loadingLines: {
    flex: 1,
    gap: Spacing.two,
  },
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  name: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: FontFamily.extrabold,
    letterSpacing: -0.4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
});
