import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useScrollToTop } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card, InitialAvatar } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BrandRefreshControl } from '@/components/ui/refresh-control';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Skeleton } from '@/components/ui/skeleton';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';
import { ApiError, getProfile, listApplications, listJobs, type Application, type Job, type Profile } from '@/api/client';

const STATUS_TONE: Record<Application['status'], BadgeTone> = {
  Pending: 'warning',
  Accepted: 'success',
  Rejected: 'error',
};
const STATUS_LABEL: Record<Application['status'], string> = {
  Pending: 'Under review',
  Accepted: 'Accepted',
  Rejected: 'Not selected',
};

// How many recommended jobs / recent applications to preview -- the full
// lists live on the Browse and Applications tabs, this is a teaser only.
const PREVIEW_COUNT = 3;

// The student landing tab (mirrors the website's /student/dashboard being
// a separate overview page from /student/jobs): a progress banner, KPI
// snapshot, quick actions, and short previews of recommended jobs and
// recent applications. Guarded to students only -- see (tabs)/_layout.tsx.
export default function DashboardScreen() {
  const tabBarInset = useTabBarInset();
  const scrollTopRef = useRef<ScrollView>(null);
  useScrollToTop(scrollTopRef);
  const theme = useTheme();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [recommended, setRecommended] = useState<Job[]>([]);
  const [openJobsCount, setOpenJobsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [profileRes, apps, jobsRes] = await Promise.all([
        getProfile(),
        listApplications(),
        // Newest-first, same as the website's "Recommended for you" query --
        // real personalization by department/skill is a separate change.
        listJobs({ limit: PREVIEW_COUNT - 1 }),
      ]);
      setProfile(profileRes);
      setApplications(apps);
      setRecommended(jobsRes.jobs);
      setOpenJobsCount(jobsRes.total);
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

  const applicationsCount = applications.length;
  const pendingCount = applications.filter((a) => a.status === 'Pending').length;
  const acceptedCount = applications.filter((a) => a.status === 'Accepted').length;
  const recentApps = applications.slice(0, PREVIEW_COUNT);

  const hasAcademic = Boolean(profile?.university && profile?.courseOfStudy);
  const hasResume = Boolean(profile?.resumeUrl);
  const hasSkills = Boolean(profile?.skills?.length);
  const hasApplied = applicationsCount > 0;
  const completedSteps = [hasAcademic, hasResume, hasSkills, hasApplied].filter(Boolean).length;
  const progressPct = completedSteps * 25;

  const firstName = (profile?.name || user?.name || '').split(' ')[0] || 'there';

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
          <ScreenHeader eyebrow={`Hi ${firstName} 👋`} title="Home" subtitle="Here's where your SIWES search stands today." />

          {error ? <ErrorBanner message={error} onRetry={() => load()} style={styles.sectionPad} /> : null}

          <Animated.View entering={FadeInDown.duration(350).delay(60)} style={styles.sectionPad}>
            <LinearGradient
              colors={[theme.gradientStart, theme.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroTop}>
                <View style={styles.heroTopText}>
                  <ThemedText style={styles.heroLabel}>Profile completion</ThemedText>
                  <ThemedText style={styles.heroDescription}>
                    {hasApplied
                      ? `${applicationsCount} application${applicationsCount === 1 ? '' : 's'} submitted. ${
                          !hasResume ? 'Add a resume to boost your match score.' : 'Keep your profile fresh to stay competitive.'
                        }`
                      : 'Complete your profile and submit your first application.'}
                  </ThemedText>
                </View>
                <ThemedText style={styles.heroPct}>{progressPct}%</ThemedText>
              </View>
              <View style={styles.heroTrack}>
                <View style={[styles.heroFill, { width: `${progressPct}%` }]} />
              </View>
              <View style={styles.heroActions}>
                <PressableScale onPress={() => router.push('/browse-jobs')} style={[styles.heroButton, styles.heroButtonPrimary]}>
                  <Ionicons name="search" size={15} color={theme.primary} />
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    Find opportunities
                  </ThemedText>
                </PressableScale>
                <PressableScale onPress={() => router.push('/profile')} style={[styles.heroButton, styles.heroButtonGhost]}>
                  <ThemedText type="smallBold" style={styles.heroButtonGhostText}>
                    Complete profile →
                  </ThemedText>
                </PressableScale>
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(110)} style={[styles.kpiRow, styles.sectionPad]}>
            <Kpi value={applicationsCount} label="Applications sent" />
            <Kpi value={pendingCount} label="Under review" tone="warning" />
            <Kpi value={acceptedCount} label="Offers received" tone="success" />
            <Kpi value={openJobsCount} label="Open opportunities" />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(160)} style={[styles.quickActions, styles.sectionPad]}>
            <QuickAction icon="search" label="Search opportunities" onPress={() => router.push('/browse-jobs')} />
            <QuickAction icon="checkmark-circle-outline" label="Track applications" onPress={() => router.push('/applications')} />
            <QuickAction icon="cloud-upload-outline" label="Upload resume" onPress={() => router.push('/profile')} />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(210)} style={styles.sectionPad}>
            <SectionHeader title="Recommended for you" onSeeAll={() => router.push('/browse-jobs')} />
            {recommended.length === 0 ? (
              <Card>
                <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                  No opportunities available yet — check back soon.
                </ThemedText>
              </Card>
            ) : (
              <View style={styles.recommendedList}>
                {recommended.map((job) => {
                  const companyName = job.employerId?.companyName || job.employerId?.name || 'Company';
                  return (
                    <Card key={job._id} onPress={() => router.push(`/jobs/${job._id}`)} style={styles.recommendedCard}>
                      <View style={styles.recommendedHeader}>
                        <InitialAvatar name={companyName} size={36} />
                        <Badge label="Verified" tone="success" />
                      </View>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {job.title}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {companyName} · {job.location} · {job.duration}
                      </ThemedText>
                    </Card>
                  );
                })}
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(260)} style={styles.sectionPad}>
            <SectionHeader title="Recent applications" />
            {recentApps.length === 0 ? (
              <Card style={styles.emptyApps}>
                <View style={[styles.emptyAppsIcon, { backgroundColor: theme.primarySoft }]}>
                  <Ionicons name="business-outline" size={22} color={theme.primary} />
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                  You haven&apos;t applied to any placements yet.
                </ThemedText>
                <PressableScale onPress={() => router.push('/browse-jobs')}>
                  <ThemedText type="smallBold" themeColor="primary">
                    Browse opportunities →
                  </ThemedText>
                </PressableScale>
              </Card>
            ) : (
              <Card style={styles.appsCard}>
                {recentApps.map((app, i) => (
                  <View
                    key={app._id}
                    style={[styles.appRow, i < recentApps.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
                  >
                    <ThemedText type="small" style={styles.appRowText} numberOfLines={1}>
                      {app.job?.title || 'Untitled role'} — {app.job?.employerId?.companyName || 'Unknown company'}
                    </ThemedText>
                    <Badge label={STATUS_LABEL[app.status]} tone={STATUS_TONE[app.status]} />
                  </View>
                ))}
              </Card>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Kpi({ value, label, tone }: { value: number; label: string; tone?: 'warning' | 'success' }) {
  const theme = useTheme();
  const color = tone === 'warning' ? theme.warning : tone === 'success' ? theme.success : theme.text;
  return (
    <Card style={styles.kpiCard}>
      <ThemedText style={[styles.kpiValue, { color }]}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Card>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={styles.quickActionCard}>
      <View style={[styles.quickActionIcon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <ThemedText type="smallBold" style={styles.quickActionLabel} numberOfLines={2}>
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
    padding: Spacing.four,
    borderRadius: Radius.xl,
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
  heroPct: {
    color: '#ffffff',
    fontFamily: FontFamily.extrabold,
    fontSize: 28,
    lineHeight: 32,
  },
  heroTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  heroFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.half,
    borderRadius: Radius.md,
  },
  heroButtonPrimary: {
    backgroundColor: '#ffffff',
  },
  heroButtonGhost: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroButtonGhostText: {
    color: '#ffffff',
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
  quickActions: {
    gap: Spacing.two,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    flex: 1,
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
  recommendedList: {
    gap: Spacing.three,
  },
  recommendedCard: {
    gap: Spacing.two,
  },
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyApps: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  emptyAppsIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appsCard: {
    padding: 0,
    gap: 0,
    overflow: 'hidden',
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  appRowText: {
    flex: 1,
  },
});
