import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { Card, InitialAvatar } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Field } from '@/components/ui/field';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BrandRefreshControl } from '@/components/ui/refresh-control';
import { SkeletonList } from '@/components/ui/skeleton';
import { SwipeRow } from '@/components/ui/swipe-row';
import { useToast } from '@/components/ui/toast';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';
import { ApiError, listJobs, listSavedJobs, toggleSavedJob, type Job } from '@/api/client';

type JobType = 'On-site' | 'Remote' | 'Hybrid';
const TYPE_FILTERS: JobType[] = ['On-site', 'Remote', 'Hybrid'];

// Stagger card entrances, but stop delaying after the first screenful so
// off-screen rows don't animate in late while scrolling.
const STAGGER_MS = 55;
const MAX_STAGGERED = 8;

// '/' is where login, signup, and verify-email all land (router.replace('/')),
// and where a cold start opens -- so this route doubles as the role
// dispatcher, mirroring the website's role-scoped dashboards. Students get
// the Jobs feed; everyone else is bounced straight to their own dashboard
// (their Jobs tab is hidden by (tabs)/_layout.tsx, this makes '/' unreachable
// for them too).
export default function HomeTab() {
  const { user } = useAuth();
  if (user?.role === 'employer') return <Redirect href="/employer-applicants" />;
  if (user?.role === 'school') return <Redirect href="/school-overview" />;
  return <JobsScreen />;
}

function JobsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [type, setType] = useState<JobType | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [bestMatch, setBestMatch] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const firstName = user?.name?.split(' ')[0];

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
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
        setRefreshing(false);
      }
    },
    [query, type, savedOnly, bestMatch]
  );

  // Re-fetch every time the tab regains focus, so a bookmark toggled from the
  // job-detail screen (or an apply that closes a job) is reflected on return.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Debounce free-text search so we don't fire a request per keystroke.
  // Skipped on the first render: the focus effect above already loads on
  // mount, and without the guard every mount fired a second, redundant
  // request 350ms later.
  const isFirstQueryRun = useRef(true);
  useEffect(() => {
    if (isFirstQueryRun.current) {
      isFirstQueryRun.current = false;
      return;
    }
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
      toast(saved ? 'Saved for later' : 'Removed from saved');
    } catch {
      toast("Couldn't update the bookmark — try again.", 'error');
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <Animated.View entering={FadeInDown.duration(320)} style={styles.header}>
          <View style={styles.headerText}>
            {firstName ? (
              <ThemedText type="small" themeColor="textSecondary">
                Hi {firstName} 👋
              </ThemedText>
            ) : null}
            <ThemedText style={styles.headerTitle}>Find your placement</ThemedText>
          </View>

          <Field
            icon="search-outline"
            value={query}
            onChangeText={(v) => {
              setSavedOnly(false);
              setQuery(v);
            }}
            placeholder="Search title, skill, company, location…"
            returnKeyType="search"
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
                <Chip
                  label={item}
                  active={active}
                  onPress={() => {
                    setSavedOnly(false);
                    setType(isAll ? null : (item as JobType));
                  }}
                />
              );
            }}
            ListFooterComponent={
              <View style={styles.filterRowInline}>
                <Chip
                  label="Best match"
                  icon="flash"
                  active={bestMatch && !savedOnly}
                  onPress={() => {
                    setSavedOnly(false);
                    setBestMatch((v) => !v);
                  }}
                />
                <Chip
                  label="Saved"
                  icon="bookmark"
                  active={savedOnly}
                  onPress={() => setSavedOnly((v) => !v)}
                />
              </View>
            }
          />
        </Animated.View>

        {error ? <ErrorBanner message={error} style={styles.errorBanner} /> : null}

        {loading ? (
          <SkeletonList />
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={(job) => job._id}
            contentContainerStyle={styles.list}
            refreshControl={<BrandRefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
            ListEmptyComponent={
              <EmptyState
                icon={savedOnly ? 'bookmark-outline' : 'search-outline'}
                title={savedOnly ? 'Nothing saved yet' : 'No matches found'}
                message={
                  savedOnly
                    ? 'Tap the bookmark on any opportunity to keep it here for later.'
                    : 'Try a different search term or clear your filters.'
                }
              />
            }
            renderItem={({ item, index }) => {
              const companyName = item.employerId?.companyName || item.employerId?.name || 'Company';
              const isSaved = savedIds.has(item._id);
              return (
                <Animated.View
                  entering={FadeInDown.duration(320).delay(Math.min(index, MAX_STAGGERED) * STAGGER_MS)}
                >
                  <SwipeRow
                    actions={[
                      {
                        icon: isSaved ? 'bookmark' : 'bookmark-outline',
                        label: isSaved ? 'Unsave' : 'Save',
                        color: theme.primary,
                        onPress: () => handleToggleSave(item._id),
                      },
                    ]}
                  >
                  <Card onPress={() => router.push(`/jobs/${item._id}`)}>
                    <View style={styles.cardHeader}>
                      <InitialAvatar name={companyName} />
                      <View style={styles.cardHeaderText}>
                        <ThemedText type="smallBold" numberOfLines={1}>
                          {item.title}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                          {companyName} · {item.location}
                        </ThemedText>
                      </View>
                      <PressableScale
                        onPress={() => handleToggleSave(item._id)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={isSaved ? 'Remove bookmark' : 'Bookmark this opportunity'}
                        style={styles.bookmark}
                      >
                        <Ionicons
                          name={isSaved ? 'bookmark' : 'bookmark-outline'}
                          size={21}
                          color={isSaved ? theme.primary : theme.textSecondary}
                        />
                      </PressableScale>
                    </View>
                    <View style={styles.badgeRow}>
                      <Badge label={item.type} tone="neutral" />
                      <Badge label={item.duration} tone="neutral" icon="time-outline" />
                      {item.stipend ? <Badge label={item.stipend} tone="success" icon="cash-outline" /> : null}
                      {item.matchScore != null ? (
                        <Badge label={`${item.matchScore}% match`} tone="primary" icon="flash" />
                      ) : null}
                    </View>
                  </Card>
                  </SwipeRow>
                </Animated.View>
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
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  headerText: {
    gap: Spacing.half,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  filterRow: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  filterRowInline: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginLeft: Spacing.two,
  },
  errorBanner: {
    marginHorizontal: Spacing.four,
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
    flexGrow: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardHeaderText: {
    flex: 1,
    gap: Spacing.half,
  },
  bookmark: {
    padding: Spacing.one,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
