import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useScrollToTop } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Extrapolation,
  FadeInDown,
  ZoomIn,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

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
import { FontFamily, Spacing } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';
import { ApiError, listJobs, listSavedJobs, toggleSavedJob, type Job } from '@/api/client';

type JobType = 'On-site' | 'Remote' | 'Hybrid';
const TYPE_FILTERS: JobType[] = ['On-site', 'Remote', 'Hybrid'];

// Stagger card entrances, but stop delaying after the first screenful so
// off-screen rows don't animate in late while scrolling.
const STAGGER_MS = 55;
const MAX_STAGGERED = 8;

// The greeting + big title block collapses away over the first bit of list
// scroll (the search field and filters stay pinned).
const HERO_HEIGHT = 64;
const HERO_COLLAPSE_DISTANCE = 72;

// Jobs matching at least this well get the glow accent along the card's
// bottom edge -- a highlight, not a default.
const GLOW_MATCH_THRESHOLD = 70;

// Fetched a page at a time (infinite scroll via onEndReached) instead of one
// long single fetch -- keeps the initial load light and avoids dumping the
// whole feed into one long scroll.
const PAGE_SIZE = 12;

// The full search/browse feed -- reached from the Home dashboard tab's
// "Find opportunities" CTA and quick actions, or directly via this tab.
// Guarded to students only (see (tabs)/_layout.tsx's Tabs.Protected block),
// so unlike the old index.tsx this never needs a role check of its own.
export default function BrowseJobsScreen() {
  const tabBarInset = useTabBarInset();
  // Re-pressing the active tab scrolls this screen back to the top.
  const scrollTopRef = useRef<FlatList<Job>>(null);
  useScrollToTop(scrollTopRef);
  const theme = useTheme();
  const { user } = useAuth();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [type, setType] = useState<JobType | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [bestMatch, setBestMatch] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const firstName = user?.name?.split(' ')[0];

  // Always resets to page 1 -- called on mount, on focus, on filter changes,
  // and on pull-to-refresh. loadMore (below) appends subsequent pages.
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
          setPage(1);
          setTotalPages(1);
        } else {
          const { jobs: feedJobs, totalPages: pages } = await listJobs({
            q: query.trim() || undefined,
            type: type ?? undefined,
            sort: bestMatch ? 'match' : undefined,
            limit: PAGE_SIZE,
            page: 1,
          });
          setJobs(feedJobs);
          setPage(1);
          setTotalPages(pages);
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

  // Fetches and appends the next page as the list nears its end. A failed
  // page fetch fails silently -- pull-to-refresh or more scrolling can
  // retry, and surfacing an error banner for a background append would be
  // more disruptive than useful.
  const loadMore = useCallback(async () => {
    if (savedOnly || loading || refreshing || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { jobs: feedJobs, totalPages: pages } = await listJobs({
        q: query.trim() || undefined,
        type: type ?? undefined,
        sort: bestMatch ? 'match' : undefined,
        limit: PAGE_SIZE,
        page: nextPage,
      });
      setJobs((prev) => [...prev, ...feedJobs]);
      setPage(nextPage);
      setTotalPages(pages);
    } catch {
      // See comment above -- silent on purpose.
    } finally {
      setLoadingMore(false);
    }
  }, [savedOnly, loading, refreshing, loadingMore, page, totalPages, query, type, bestMatch]);

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

  // Optimistic: the bookmark flips (and pops) instantly, then reconciles
  // with the server's answer -- rolled back with an error toast on failure.
  const handleToggleSave = async (jobId: string) => {
    const wasSaved = savedIds.has(jobId);
    const applySaved = (saved: boolean) =>
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (saved) next.add(jobId);
        else next.delete(jobId);
        return next;
      });

    applySaved(!wasSaved);
    try {
      const { saved } = await toggleSavedJob(jobId);
      applySaved(saved);
      if (savedOnly && !saved) {
        setJobs((prev) => prev.filter((j) => j._id !== jobId));
      }
      toast(saved ? 'Saved for later' : 'Removed from saved');
    } catch {
      applySaved(wasSaved);
      toast("Couldn't update the bookmark — try again.", 'error');
    }
  };

  // Collapsing hero: driven by the job list's scroll position, on the UI
  // thread. The block shrinks to zero height and fades over the first
  // ~72px of scroll.
  const scrollY = useSharedValue(0);
  const onListScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const heroStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, HERO_COLLAPSE_DISTANCE], [HERO_HEIGHT, 0], Extrapolation.CLAMP),
    opacity: interpolate(scrollY.value, [0, HERO_COLLAPSE_DISTANCE * 0.75], [1, 0], Extrapolation.CLAMP),
    overflow: 'hidden' as const,
  }));

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <Animated.View entering={FadeInDown.duration(320)} style={styles.header}>
          <Animated.View style={[styles.headerText, heroStyle]}>
            {firstName ? (
              <ThemedText type="small" themeColor="textSecondary">
                Hi {firstName} 👋
              </ThemedText>
            ) : null}
            <ThemedText style={styles.headerTitle}>Find your placement</ThemedText>
          </Animated.View>

          {!query.trim() && !savedOnly ? (
            <ThemedText type="small" themeColor="textSecondary">
              Showing opportunities from your department and skills — search for everything else.
            </ThemedText>
          ) : null}

          <Field
            icon="search-outline"
            value={query}
            onChangeText={(v) => {
              setSavedOnly(false);
              setQuery(v);
            }}
            onClear={() => setQuery('')}
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

        {error ? <ErrorBanner message={error} onRetry={() => load()} style={styles.errorBanner} /> : null}

        {loading ? (
          <SkeletonList />
        ) : (
          <Animated.FlatList
            data={jobs}
            keyExtractor={(job) => job._id}
            ref={scrollTopRef}
            contentContainerStyle={[styles.list, { paddingBottom: tabBarInset }]}
            onScroll={onListScroll}
            scrollEventThrottle={16}
            keyboardDismissMode="on-drag"
            refreshControl={<BrandRefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
            onEndReachedThreshold={0.5}
            onEndReached={loadMore}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadMoreFooter}>
                  <ActivityIndicator color={theme.primary} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                icon={savedOnly ? 'bookmark-outline' : 'search-outline'}
                title={savedOnly ? 'Nothing saved yet' : 'No matches found'}
                message={
                  savedOnly
                    ? 'Tap the bookmark on any opportunity to keep it here for later.'
                    : 'Try a different search term or clear your filters.'
                }
                // Filter changes re-run load via the focus effect's
                // dependency on `load`, so resetting state is enough.
                actionLabel={query || type !== null || bestMatch || savedOnly ? 'Clear filters' : undefined}
                onAction={() => {
                  setQuery('');
                  setType(null);
                  setBestMatch(false);
                  setSavedOnly(false);
                }}
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
                  <Card onPress={() => router.push(`/jobs/${item._id}`)} style={styles.cardSurface}>
                    {/* Accent glow rising from the card's bottom edge for
                        strong matches (see reference design). */}
                    {item.matchScore != null && item.matchScore >= GLOW_MATCH_THRESHOLD ? (
                      <LinearGradient
                        colors={['transparent', theme.primarySoft]}
                        style={styles.cardGlow}
                        pointerEvents="none"
                      />
                    ) : null}
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
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel={isSaved ? 'Remove bookmark' : 'Bookmark this opportunity'}
                        style={[
                          styles.bookmarkCircle,
                          { backgroundColor: isSaved ? theme.primarySoft : theme.backgroundSelected },
                        ]}
                      >
                        <Animated.View
                          key={isSaved ? 'saved' : 'unsaved'}
                          entering={ZoomIn.springify().damping(12)}
                        >
                          <Ionicons
                            name={isSaved ? 'bookmark' : 'bookmark-outline'}
                            size={18}
                            color={isSaved ? theme.primary : theme.textSecondary}
                          />
                        </Animated.View>
                      </PressableScale>
                    </View>
                    <View style={styles.badgeRow}>
                      <Badge label={item.type} tone="neutral" />
                      <Badge label={item.duration} tone="neutral" icon="time-outline" />
                      {item.department ? <Badge label={item.department} tone="primary" icon="school-outline" /> : null}
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
    fontFamily: FontFamily.extrabold,
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
  loadMoreFooter: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
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
  cardSurface: {
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 52,
  },
  bookmarkCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
