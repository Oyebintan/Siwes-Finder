import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { Card, InitialAvatar } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Field } from '@/components/ui/field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SkeletonList } from '@/components/ui/skeleton';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, getSchoolStudents, type SchoolStudent } from '@/api/client';

export default function SchoolStudentsScreen() {
  const theme = useTheme();

  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setPendingApproval(false);
    try {
      const { students: list } = await getSchoolStudents();
      setStudents(list);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setPendingApproval(true);
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not load students. Check your connection.');
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

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? students.filter((s) => [s.name, s.email, s.department, s.faculty, s.level].filter(Boolean).join(' ').toLowerCase().includes(q))
      : students;
    const groups = new Map<string, SchoolStudent[]>();
    for (const s of filtered) {
      const key = s.faculty ? `${s.faculty} — ${s.department}` : s.department;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [students, query]);

  if (pendingApproval) {
    return (
      <ThemedView style={styles.centerFill}>
        <EmptyState
          icon="hourglass-outline"
          title="Awaiting verification"
          message="Student records unlock once an admin approves your school account."
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <ScreenHeader title="Students" />
          <View style={styles.searchWrap}>
            <Field
              icon="search-outline"
              value={query}
              onChangeText={setQuery}
              placeholder="Search name, department, level…"
            />
          </View>
        </View>

        {error ? <ErrorBanner message={error} style={styles.errorBanner} /> : null}

        {loading ? (
          <SkeletonList />
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {grouped.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No students found"
                message={query ? 'Try a different search term.' : 'Students who register with your institution name appear here.'}
              />
            ) : (
              grouped.map(([dept, list], groupIndex) => (
                <Animated.View
                  key={dept}
                  entering={FadeInDown.duration(320).delay(Math.min(groupIndex, 5) * 70)}
                  style={styles.group}
                >
                  <View style={styles.groupHeader}>
                    <Ionicons name="git-branch-outline" size={14} color={theme.textSecondary} />
                    <ThemedText type="smallBold" style={styles.groupTitle} numberOfLines={1}>
                      {dept}
                    </ThemedText>
                    <Badge label={`${list.length}`} tone="neutral" />
                  </View>
                  {list.map((s) => (
                    <Card key={s._id} onPress={() => router.push(`/school/students/${s._id}`)}>
                      <View style={styles.cardRow}>
                        <InitialAvatar name={s.name} size={40} />
                        <View style={styles.cardText}>
                          <ThemedText type="smallBold" numberOfLines={1}>
                            {s.name}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                            {s.level || 'Level not set'} · {s.logbookApproved}/{s.logbookEntries} approved
                          </ThemedText>
                        </View>
                        {s.placedAt ? (
                          <Badge label={s.placedAt} tone="success" icon="checkmark-circle" />
                        ) : s.applicationCount > 0 ? (
                          <Badge label={`${s.applicationCount} app${s.applicationCount === 1 ? '' : 's'}`} tone="warning" icon="paper-plane-outline" />
                        ) : (
                          <Badge label="Not applied" tone="neutral" />
                        )}
                      </View>
                    </Card>
                  ))}
                </Animated.View>
              ))
            )}
          </ScrollView>
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
  header: {
    gap: Spacing.two,
  },
  searchWrap: {
    paddingHorizontal: Spacing.four,
  },
  errorBanner: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.four,
    flexGrow: 1,
  },
  group: {
    gap: Spacing.two,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
  },
  groupTitle: {
    flexShrink: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardText: {
    flex: 1,
    gap: Spacing.half,
  },
});
