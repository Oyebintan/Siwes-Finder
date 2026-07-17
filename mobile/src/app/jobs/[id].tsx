import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, InitialAvatar } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { MatchRing } from '@/components/ui/match-ring';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  ApiError,
  applyToJob,
  getFollowStatus,
  getJob,
  listSavedJobIds,
  toggleFollowCompany,
  toggleSavedJob,
  type Job,
} from '@/api/client';

const METHOD_LABEL: Record<Job['applicationMethod'], string> = {
  platform: 'In-app',
  email: 'By email',
  external: 'External link',
};

export default function JobDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applied, setApplied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [{ job: jobData }, { ids }] = await Promise.all([getJob(id), listSavedJobIds()]);
      setJob(jobData);
      setSaved(ids.includes(id));
      if (jobData.employerId?._id) {
        getFollowStatus(jobData.employerId._id)
          .then(({ following: isFollowing }) => setFollowing(isFollowing))
          .catch(() => setFollowing(false));
      }
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not load this opportunity. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleToggleSave = async () => {
    try {
      const { saved: nowSaved } = await toggleSavedJob(id);
      setSaved(nowSaved);
      toast(nowSaved ? 'Saved for later' : 'Removed from saved');
    } catch {
      toast("Couldn't update the bookmark — try again.", 'error');
    }
  };

  const handleToggleFollow = async () => {
    if (!job?.employerId?._id || followBusy) return;
    setFollowBusy(true);
    try {
      const { following: nowFollowing } = await toggleFollowCompany(job.employerId._id);
      setFollowing(nowFollowing);
      toast(nowFollowing ? "Following — you'll hear about new posts" : 'Unfollowed');
    } catch {
      toast("Couldn't update the follow — try again.", 'error');
    } finally {
      setFollowBusy(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    setApplyError('');
    try {
      await applyToJob(id);
      setApplied(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      setApplyError(err instanceof ApiError ? err.message : 'Could not submit your application. Check your connection.');
    } finally {
      setApplying(false);
    }
  };

  const handleShare = async (jobToShare: Job) => {
    const company = jobToShare.employerId?.companyName || jobToShare.employerId?.name || 'a company';
    try {
      await Share.share({
        message: `${jobToShare.title} at ${company} (${jobToShare.location}) — found on SIWES Finder. Get the app: https://siwes-finder-eight.vercel.app`,
      });
    } catch {
      // The user dismissing the share sheet isn't an error worth surfacing.
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingWrap}>
        <View style={styles.loadingHeader}>
          <Skeleton width={56} height={56} radius={28} />
          <View style={styles.loadingLines}>
            <Skeleton width="80%" height={20} />
            <Skeleton width="55%" height={14} />
          </View>
        </View>
        <Skeleton height={110} radius={Radius.lg} />
        <Skeleton height={160} radius={Radius.lg} />
      </ThemedView>
    );
  }

  if (loadError || !job) {
    return (
      <ThemedView style={styles.flex}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load this opportunity"
          message={loadError || 'This opportunity is no longer available.'}
          actionLabel="Try again"
          onAction={load}
        />
      </ThemedView>
    );
  }

  const companyName = job.employerId?.companyName || job.employerId?.name || 'Company';
  const spotsRemaining = job.maxApplicants != null ? Math.max(0, job.maxApplicants - job.applicantCount) : null;

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <Animated.View entering={FadeInDown.duration(320)} style={styles.titleRow}>
          <InitialAvatar name={companyName} size={56} />
          <View style={styles.titleText}>
            <ThemedText style={styles.title}>{job.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {companyName} · {job.location}
            </ThemedText>
          </View>
          <PressableScale
            onPress={() => handleShare(job)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Share this opportunity"
          >
            <Ionicons name="share-social-outline" size={23} color={theme.textSecondary} />
          </PressableScale>
          <PressableScale
            onPress={handleToggleSave}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove bookmark' : 'Bookmark this opportunity'}
          >
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={24} color={saved ? theme.primary : theme.textSecondary} />
          </PressableScale>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(320).delay(70)} style={styles.badgeRow}>
          <Badge label={job.type} tone="neutral" />
          <Badge label={job.duration} tone="neutral" icon="time-outline" />
          {job.stipend ? <Badge label={job.stipend} tone="success" icon="cash-outline" /> : null}
        </Animated.View>

        {job.matchScore != null ? (
          <Animated.View entering={FadeInDown.duration(320).delay(100)}>
            <Card style={styles.matchCard}>
              <MatchRing score={job.matchScore} />
              <View style={styles.matchText}>
                <ThemedText type="smallBold">Skill match</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Based on the skills on your profile — keep it updated for sharper matches.
                </ThemedText>
              </View>
            </Card>
          </Animated.View>
        ) : null}

        {job.employerId?._id ? (
          <Animated.View entering={FadeInDown.duration(320).delay(120)}>
            <Button
              label={following ? 'Following' : `Follow ${companyName}`}
              icon={following ? 'checkmark-circle' : 'notifications-outline'}
              variant={following ? 'ghost' : 'secondary'}
              small
              onPress={handleToggleFollow}
              disabled={followBusy}
              style={styles.followButton}
            />
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.duration(320).delay(170)}>
          <Card style={styles.section}>
            <ThemedText type="smallBold">Overview</ThemedText>
            <OverviewRow icon="paper-plane-outline" label="Application method" value={METHOD_LABEL[job.applicationMethod] ?? 'In-app'} />
            {job.applicationDeadline ? (
              <OverviewRow
                icon="calendar-outline"
                label="Apply by"
                value={new Date(job.applicationDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              />
            ) : null}
            {spotsRemaining != null ? (
              <OverviewRow icon="people-outline" label="Spots remaining" value={`${spotsRemaining} of ${job.maxApplicants}`} />
            ) : null}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(320).delay(220)}>
          <Card style={styles.section}>
            <ThemedText type="smallBold">Description</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.description}>
              {job.description}
            </ThemedText>
          </Card>
        </Animated.View>

        {job.requirements.length > 0 ? (
          <Animated.View entering={FadeInDown.duration(320).delay(270)}>
            <Card style={styles.section}>
              <ThemedText type="smallBold">Requirements</ThemedText>
              {job.requirements.map((req, idx) => (
                <View key={idx} style={styles.requirementRow}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.success} style={styles.requirementIcon} />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.requirement}>
                    {req}
                  </ThemedText>
                </View>
              ))}
            </Card>
          </Animated.View>
        ) : null}
      </ScrollView>

      <ThemedView
        type="backgroundElement"
        // The bar hugs the screen's bottom edge, so it absorbs the
        // gesture-nav inset itself -- otherwise the Apply button sits
        // under the system pill on edge-to-edge devices.
        style={[styles.applyBar, { borderColor: theme.border, paddingBottom: Spacing.three + insets.bottom }]}
      >
        {applyError ? <ErrorBanner message={applyError} /> : null}
        <ApplyAction job={job} applying={applying} applied={applied} onApply={handleApply} />
      </ThemedView>
    </ThemedView>
  );
}

function OverviewRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.overviewRow}>
      <View style={styles.overviewLabel}>
        <Ionicons name={icon} size={15} color={theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      </View>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

function ApplyAction({
  job,
  applying,
  applied,
  onApply,
}: {
  job: Job;
  applying: boolean;
  applied: boolean;
  onApply: () => void;
}) {
  const theme = useTheme();

  if (job.applicationMethod === 'email' && job.applicationEmail) {
    const subject = encodeURIComponent(`SIWES Application: ${job.title}`);
    return (
      <Button
        label="Apply via Email"
        icon="mail-outline"
        onPress={() => Linking.openURL(`mailto:${job.applicationEmail}?subject=${subject}`)}
      />
    );
  }

  if (job.applicationMethod === 'external' && job.applicationUrl) {
    return <Button label="Apply on Company Site" icon="open-outline" onPress={() => Linking.openURL(job.applicationUrl!)} />;
  }

  if (applied) {
    return (
      <Animated.View
        entering={FadeInDown.duration(300)}
        style={[styles.appliedButton, { backgroundColor: theme.successSoft }]}
      >
        <Animated.View entering={ZoomIn.springify().damping(9).delay(120)}>
          <Ionicons name="checkmark-circle" size={26} color={theme.success} />
        </Animated.View>
        <ThemedText themeColor="success" type="smallBold">
          Application submitted 🎉
        </ThemedText>
      </Animated.View>
    );
  }

  return <Button label="Apply Now" icon="paper-plane" onPress={onApply} loading={applying} />;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  titleText: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  followButton: {
    alignSelf: 'flex-start',
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  matchText: {
    flex: 1,
    gap: Spacing.half,
  },
  section: {
    gap: Spacing.two,
  },
  description: {
    lineHeight: 22,
  },
  requirementRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  requirementIcon: {
    marginTop: 2,
  },
  requirement: {
    flex: 1,
    lineHeight: 20,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  overviewLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
  },
  applyBar: {
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  appliedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    minHeight: 52,
  },
});
