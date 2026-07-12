import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, listJobs, listSavedJobs, toggleSavedJob, type Job } from '@/api/client';

type JobType = 'On-site' | 'Remote' | 'Hybrid';
const TYPE_FILTERS: JobType[] = ['On-site', 'Remote', 'Hybrid'];

export default function JobsScreen() {
  const theme = useTheme();

  const [query, setQuery] = useState('');
  const [type, setType] = useState<JobType | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [bestMatch, setBestMatch] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (savedOnly) {
        const { jobs: savedJobs, ids } = await listSavedJobs();
        setJobs(savedJobs);
        setSavedIds(new Set(ids));
      } else {
        const { jobs: feedJobs } = await listJobs({
          q: query.trim() || undefined,
          type: type ?? undefined,
          sort: bestMatch ? 'match' : undefined,
          limit: 30,
        });
        setJobs(feedJobs);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load opportunities. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [query, type, savedOnly, bestMatch]);

  // Re-fetch every time the tab regains focus, so a bookmark toggled from the
  // job-detail screen (or an apply that closes a job) is reflected on return.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Debounce free-text search so we don't fire a request per keystroke.
  useEffect(() => {
    if (savedOnly) return;
    const timeout = setTimeout(load, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleToggleSave = async (jobId: string) => {
    try {
      const { saved } = await toggleSavedJob(jobId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (saved) next.add(jobId);
        else next.delete(jobId);
        return next;
      });
      if (savedOnly && !saved) {
        setJobs((prev) => prev.filter((j) => j._id !== jobId));
      }
    } catch {
      // Bookmark toggling is best-effort; a failed request just leaves the
      // icon state unchanged, no need for a blocking error banner.
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>
            Opportunities
          </ThemedText>

          <TextInput
            value={query}
            onChangeText={(v) => {
              setSavedOnly(false);
              setQuery(v);
            }}
            placeholder="Search title, skill, company, location…"
            placeholderTextColor={theme.textSecondary}
            style={[styles.search, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
          />

          <FlatList
            horizontal
            data={['All', ...TYPE_FILTERS]}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            renderItem={({ item }) => {
              const isAll = item === 'All';
              const active = isAll ? type === null && !savedOnly : type === item && !savedOnly;
              return (
                <Pressable
                  onPress={() => {
                    setSavedOnly(false);
                    setType(isAll ? null : (item as JobType));
                  }}
                  style={[
                    styles.chip,
                    { borderColor: theme.border, backgroundColor: active ? theme.primary : theme.backgroundElement },
                  ]}
                >
                  <ThemedText type="small" style={active ? styles.chipTextActive : undefined} themeColor={active ? undefined : 'textSecondary'}>
                    {item}
                  </ThemedText>
                </Pressable>
              );
            }}
            ListFooterComponent={
              <ThemedView style={styles.filterRowInline}>
                <Pressable
                  onPress={() => {
                    setSavedOnly(false);
                    setBestMatch((v) => !v);
                  }}
                  style={[
                    styles.chip,
                    { borderColor: theme.border, backgroundColor: bestMatch && !savedOnly ? theme.primary : theme.backgroundElement },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={bestMatch && !savedOnly ? styles.chipTextActive : undefined}
                    themeColor={bestMatch && !savedOnly ? undefined : 'textSecondary'}
                  >
                    ⚡ Best match
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setSavedOnly((v) => !v)}
                  style={[
                    styles.chip,
                    { borderColor: theme.border, backgroundColor: savedOnly ? theme.primary : theme.backgroundElement },
                  ]}
                >
                  <ThemedText type="small" style={savedOnly ? styles.chipTextActive : undefined} themeColor={savedOnly ? undefined : 'textSecondary'}>
                    ★ Saved
                  </ThemedText>
                </Pressable>
              </ThemedView>
            }
          />
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
            data={jobs}
            keyExtractor={(job) => job._id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <ThemedView style={styles.center}>
                <ThemedText themeColor="textSecondary">
                  {savedOnly ? 'No saved opportunities yet.' : 'No opportunities match your search.'}
                </ThemedText>
              </ThemedView>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/jobs/${item._id}`)}
                style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              >
                <ThemedView style={styles.cardHeader}>
                  <ThemedView style={styles.cardHeaderText}>
                    <ThemedText type="smallBold">{item.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.employerId?.companyName || item.employerId?.name} · {item.location}
                    </ThemedText>
                  </ThemedView>
                  <Pressable onPress={() => handleToggleSave(item._id)} hitSlop={8}>
                    <ThemedText style={{ color: savedIds.has(item._id) ? theme.primary : theme.textSecondary }}>
                      {savedIds.has(item._id) ? '★' : '☆'}
                    </ThemedText>
                  </Pressable>
                </ThemedView>
                <ThemedView style={styles.badgeRow}>
                  <ThemedView type="backgroundSelected" style={styles.badge}>
                    <ThemedText type="small">{item.type}</ThemedText>
                  </ThemedView>
                  <ThemedView type="backgroundSelected" style={styles.badge}>
                    <ThemedText type="small">{item.duration}</ThemedText>
                  </ThemedView>
                  {item.stipend ? (
                    <ThemedView type="backgroundSelected" style={styles.badge}>
                      <ThemedText type="small">{item.stipend}</ThemedText>
                    </ThemedView>
                  ) : null}
                  {item.matchScore != null ? (
                    <ThemedView type="backgroundSelected" style={styles.badge}>
                      <ThemedText type="small" themeColor="primary">
                        {item.matchScore}% match
                      </ThemedText>
                    </ThemedView>
                  ) : null}
                </ThemedView>
              </Pressable>
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
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.three,
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
  filterRow: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  filterRowInline: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    borderWidth: 1.5,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  errorBanner: {
    marginHorizontal: Spacing.four,
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
    gap: Spacing.two,
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
});
