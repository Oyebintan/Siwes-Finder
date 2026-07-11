import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          Student records unlock once an admin approves your school account.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>
            Students
          </ThemedText>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, department, level…"
            placeholderTextColor={theme.textSecondary}
            style={[styles.search, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
          />
        </ThemedView>

        {error ? (
          <ThemedView type="backgroundElement" style={[styles.errorBanner, { borderColor: theme.error }]}>
            <ThemedText themeColor="error" type="small">
              {error}
            </ThemedText>
          </ThemedView>
        ) : null}

        <ScrollView contentContainerStyle={styles.list}>
          {grouped.length === 0 ? (
            <ThemedView style={styles.center}>
              <ThemedText themeColor="textSecondary">No students found.</ThemedText>
            </ThemedView>
          ) : (
            grouped.map(([dept, list]) => (
              <ThemedView key={dept} style={styles.group}>
                <ThemedText type="smallBold">
                  {dept} ({list.length})
                </ThemedText>
                {list.map((s) => (
                  <Pressable
                    key={s._id}
                    onPress={() => router.push(`/school/students/${s._id}`)}
                    style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                  >
                    <ThemedView style={styles.cardText}>
                      <ThemedText type="small">{s.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {s.level || 'Level not set'} · {s.logbookApproved}/{s.logbookEntries} approved
                      </ThemedText>
                    </ThemedView>
                    {s.placedAt ? (
                      <ThemedView type="backgroundSelected" style={styles.badge}>
                        <ThemedText type="small" themeColor="success">
                          {s.placedAt}
                        </ThemedText>
                      </ThemedView>
                    ) : s.applicationCount > 0 ? (
                      <ThemedView type="backgroundSelected" style={styles.badge}>
                        <ThemedText type="small" themeColor="warning">
                          {s.applicationCount} app{s.applicationCount === 1 ? '' : 's'}
                        </ThemedText>
                      </ThemedView>
                    ) : (
                      <ThemedView type="backgroundSelected" style={styles.badge}>
                        <ThemedText type="small" themeColor="textSecondary">
                          Not applied
                        </ThemedText>
                      </ThemedView>
                    )}
                  </Pressable>
                ))}
              </ThemedView>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
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
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  search: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.half,
    fontSize: 15,
  },
  errorBanner: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  group: {
    gap: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  cardText: {
    flex: 1,
    gap: Spacing.half,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
});
