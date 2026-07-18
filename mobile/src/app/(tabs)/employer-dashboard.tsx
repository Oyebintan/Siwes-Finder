import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useScrollToTop } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card, InitialAvatar } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { GradientHeroCard } from '@/components/ui/gradient-hero-card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BrandRefreshControl } from '@/components/ui/refresh-control';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Skeleton } from '@/components/ui/skeleton';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useAnimatedCounter } from '@/hooks/use-animated-counter';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';
import { ApiError, listEmployerApplications, listJobs, type EmployerApplication } from '@/api/client';

const STATUS_TONE: Record<EmployerApplication['status'], BadgeTone> = {
  Pending: 'warning',
  Accepted: 'success',
  Rejected: 'error',
};

// How many awaiting-review applicants to preview -- the full list lives on
// the Applicants tab, this is a teaser only.
const PREVIEW_COUNT = 3;

// The employer landing tab -- mirrors the student Home dashboard's shape
// (gradient hero, animated KPI row, a short "needs your attention"
// preview) but for the hiring side: open postings, applicant volume, and
// how many decisions are still pending. Guarded to employers only -- see
// (tabs)/_layout.tsx. Closes the gap this app had no employer landing
// screen before the redesign (employers used to land straight on
// Applicants).
export default function EmployerDashboardScreen() {
  const tabBarInset = useTabBarInset();
  const scrollTopRef = useRef<ScrollView>(null);
  useScrollToTop(scrollTopRef);
  const theme = useTheme();
  const { user } = useAuth();

  const [openPostings, setOpenPostings] = useState(0);
  const [applications, setApplications] = useState<EmployerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      // GET /api/jobs branches server-side by role -- an employer session
      // gets back its own postings here, the same call the student feed
      // uses to browse everyone else's.
      const [jobsRes, apps] = await Promise.all([listJobs(), listEmployerApplications()]);
      setOpenPostings(jobsRes.jobs.filter((j) => j.isActive).length);
      setApplications(apps);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your dashboard. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalApplicants = applications.length;
  const pendingReview = applications.filter((a) => a.status === 'Pending').length;
  const accepted = applications.filter((a) => a.status === 'Accepted').length;
  const rejected = applications.filter((a) => a.status === 'Rejected').length;
  const decided = accepted + rejected;
  const acceptanceRate = decided > 0 ? Math.round((accepted / decided) * 100) : 0;
  const awaitingReview = applications.filter((a) => a.status === 'Pending').slice(0, PREVIEW_COUNT);

  const firstName = (user?.name || '').split(' ')[0] || 'there';

  if (loading) {
    return (
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View style={styles.loadingWrap}>
            <Skeleton width="70%" height={22} />
            <Skeleton width="100%" height={160} radius={Radius.xl} />
            <View style={styles.loadingKpiRow}>
              <Skeleton width="47%" height={70} radius={Radius.lg} />
              <Skeleton width="47%" height={70} radius={Radius.lg} />
            </View>
            <Skeleton width="100%" height={100} radius={Radius.lg} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView
          ref={scrollTopRef}
          contentContainerStyle={[styles.container, { paddingBottom: tabBarInset }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<BrandRefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        >
          <ScreenHeader eyebrow={`Hi ${firstName} 👋`} title="Home" subtitle="Your hiring pipeline at a glance." />

          {error ? <ErrorBanner message={error} onRetry={() => load()} style={styles.sectionPad} /> : null}

          <Animated.View entering={FadeInDown.duration(350).delay(60)} style={styles.sectionPad}>
            <GradientHeroCard style={styles.hero}>
              <View style={styles.heroTop}>
                <View style={styles.heroTopText}>
                  <ThemedText style={styles.heroLabel}>Hiring pipeline</ThemedText>
                  <ThemedText style={styles.heroDescription}>
                    {pendingReview > 0
                      ? `${pendingReview} application${pendingReview === 1 ? '' : 's'} waiting on your decision.`
                      : "You're all caught up — no applications waiting on a decision."}
                  </ThemedText>
                </View>
              </View>
              <PressableScale onPress={() => router.push('/post-job')} style={[styles.heroButton, styles.heroButtonPrimary]}>
                <Ionicons name="add-circle" size={16} color={theme.primary} />
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  Post a job
                </ThemedText>
              </PressableScale>
            </GradientHeroCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(110)} style={[styles.kpiRow, styles.sectionPad]}>
            <Kpi value={openPostings} label="Open postings" />
            <Kpi value={totalApplicants} label="Total applicants" />
            <Kpi value={pendingReview} label="Pending review" tone="warning" />
            <Kpi value={acceptanceRate} label="Acceptance rate" tone="success" suffix="%" />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(160)} style={styles.sectionPad}>
            <SectionHeader title="Awaiting your review" onSeeAll={() => router.push('/employer-applicants')} />
            {awaitingReview.length === 0 ? (
              <Card>
                <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                  Nothing pending — new applications will show up here.
                </ThemedText>
              </Card>
            ) : (
              <View style={styles.previewList}>
                {awaitingReview.map((app) => (
                  <Card key={app._id} onPress={() => router.push('/employer-applicants')} style={styles.previewCard}>
                    <InitialAvatar name={app.student?.name ?? '?'} size={36} />
                    <View style={styles.previewCardText}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {app.student?.name ?? 'Unknown applicant'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {app.job?.title ?? 'Opportunity no longer available'}
                      </ThemedText>
                    </View>
                    <Badge label={app.status} tone={STATUS_TONE[app.status]} />
                  </Card>
                ))}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Kpi({
  value,
  label,
  tone,
  suffix,
}: {
  value: number;
  label: string;
  tone?: 'warning' | 'success';
  suffix?: string;
}) {
  const theme = useTheme();
  const color = tone === 'warning' ? theme.warning : tone === 'success' ? theme.success : theme.text;
  const animatedValue = useAnimatedCounter(value);
  return (
    <Card style={styles.kpiCard}>
      <ThemedText style={[styles.kpiValue, { color }]}>
        {animatedValue}
        {suffix ?? ''}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Card>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="subtitle" style={styles.sectionHeaderTitle}>
        {title}
      </ThemedText>
      {onSeeAll ? (
        <PressableScale onPress={onSeeAll} haptic={false}>
          <ThemedText type="smallBold" themeColor="primary">
            See all →
          </ThemedText>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loadingWrap: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  loadingKpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  container: {
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  sectionPad: {
    paddingHorizontal: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  hero: {
    gap: Spacing.three,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  heroTopText: {
    flex: 1,
    gap: Spacing.half,
  },
  heroLabel: {
    color: '#ffffff',
    fontFamily: FontFamily.bold,
    fontSize: 15,
    lineHeight: 20,
  },
  heroDescription: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 18,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.half,
    borderRadius: Radius.md,
    alignSelf: 'flex-start',
  },
  heroButtonPrimary: {
    backgroundColor: '#ffffff',
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  kpiCard: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: Spacing.half,
  },
  kpiValue: {
    fontFamily: FontFamily.extrabold,
    fontSize: 22,
    lineHeight: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  previewList: {
    gap: Spacing.two,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  previewCardText: {
    flex: 1,
    gap: Spacing.half,
  },
});
