import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useScrollToTop } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, InitialAvatar } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { BrandRefreshControl } from '@/components/ui/refresh-control';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SkeletonList } from '@/components/ui/skeleton';
import { Spacing } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { ApiError, listApplications, type Application } from '@/api/client';

const STATUS_COPY: Record<Application['status'], { label: string; tone: BadgeTone }> = {
  Pending: { label: 'Under review', tone: 'warning' },
  Accepted: { label: 'Accepted', tone: 'success' },
  Rejected: { label: 'Not selected', tone: 'error' },
};

const STAGGER_MS = 55;
const MAX_STAGGERED = 8;

export default function ApplicationsScreen() {
  const tabBarInset = useTabBarInset();
  // Re-pressing the active tab scrolls this screen back to the top.
  const scrollTopRef = useRef<FlatList<Application>>(null);
  useScrollToTop(scrollTopRef);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setApplications(await listApplications());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your applications. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch on every focus so a newly submitted application shows up
  // immediately after returning from a job's detail screen.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScreenHeader title="Applications" subtitle="Track every placement you've applied to" />

        {error ? <ErrorBanner message={error} onRetry={() => load()} style={styles.errorBanner} /> : null}

        {loading ? (
          <SkeletonList />
        ) : (
          <FlatList
            data={applications}
            keyExtractor={(app) => app._id}
            ref={scrollTopRef}
            contentContainerStyle={[styles.list, { paddingBottom: tabBarInset }]}
            refreshControl={<BrandRefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
            ListEmptyComponent={
              <EmptyState
                icon="paper-plane-outline"
                title="No applications yet"
                message="Browse opportunities and apply — everything you send lands here."
              />
            }
            renderItem={({ item, index }) => {
              const status = STATUS_COPY[item.status];
              const companyName = item.job?.employerId?.companyName || 'Company';
              return (
                <Animated.View
                  entering={FadeInDown.duration(320).delay(Math.min(index, MAX_STAGGERED) * STAGGER_MS)}
                >
                  <Card onPress={item.job ? () => router.push(`/jobs/${item.job!._id}`) : undefined}>
                    <View style={styles.cardRow}>
                      <InitialAvatar name={companyName} />
                      <View style={styles.cardHeaderText}>
                        <ThemedText type="smallBold" numberOfLines={1}>
                          {item.job?.title ?? 'Opportunity no longer available'}
                        </ThemedText>
                        {item.job ? (
                          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                            {companyName} · {item.job.location}
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.cardFooter}>
                      <Badge label={status.label} tone={status.tone} />
                      <Button
                        label="Message"
                        icon="chatbubble-ellipses-outline"
                        variant="ghost"
                        small
                        onPress={() => router.push(`/messages/${item._id}`)}
                      />
                    </View>
                  </Card>
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
  errorBanner: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
    flexGrow: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardHeaderText: {
    flex: 1,
    gap: Spacing.half,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
