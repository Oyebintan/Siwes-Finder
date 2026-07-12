import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
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
    } catch {
      // Best-effort, same as the Jobs list -- leave the star state unchanged.
    }
  };

  const handleToggleFollow = async () => {
    if (!job?.employerId?._id || followBusy) return;
    setFollowBusy(true);
    try {
      const { following: nowFollowing } = await toggleFollowCompany(job.employerId._id);
      setFollowing(nowFollowing);
    } catch {
      // Best-effort -- leave the button state unchanged, the user can retry.
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
    } catch (err) {
      setApplyError(err instanceof ApiError ? err.message : 'Could not submit your application. Check your connection.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  if (loadError || !job) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText themeColor="error" style={styles.centerText}>
          {loadError || 'This opportunity is no longer available.'}
        </ThemedText>
      </ThemedView>
    );
  }

  const companyName = job.employerId?.companyName || job.employerId?.name || 'Company';
  const spotsRemaining = job.maxApplicants != null ? Math.max(0, job.maxApplicants - job.applicantCount) : null;

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedView style={styles.titleRow}>
          <ThemedView style={styles.titleText}>
            <ThemedText type="subtitle">{job.title}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {companyName} · {job.location}
            </ThemedText>
          </ThemedView>
          <Pressable onPress={handleToggleSave} hitSlop={8}>
            <ThemedText style={[styles.star, { color: saved ? theme.primary : theme.textSecondary }]}>{saved ? '★' : '☆'}</ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.badgeRow}>
          <ThemedView type="backgroundSelected" style={styles.badge}>
            <ThemedText type="small">{job.type}</ThemedText>
          </ThemedView>
          <ThemedView type="backgroundSelected" style={styles.badge}>
            <ThemedText type="small">{job.duration}</ThemedText>
          </ThemedView>
          {job.stipend ? (
            <ThemedView type="backgroundSelected" style={styles.badge}>
              <ThemedText type="small">{job.stipend}</ThemedText>
            </ThemedView>
          ) : null}
          {job.matchScore != null ? (
            <ThemedView type="backgroundSelected" style={styles.badge}>
              <ThemedText type="small" themeColor="primary">
                {job.matchScore}% match
              </ThemedText>
            </ThemedView>
          ) : null}
        </ThemedView>

        {job.employerId?._id ? (
          <Pressable
            onPress={handleToggleFollow}
            disabled={followBusy}
            style={[
              styles.followButton,
              { borderColor: following ? theme.primary : theme.border, opacity: followBusy ? 0.6 : 1 },
            ]}
          >
            <ThemedText type="small" themeColor={following ? 'primary' : 'textSecondary'}>
              {following ? '✓ Following' : `Follow ${companyName}`}
            </ThemedText>
          </Pressable>
        ) : null}

        <ThemedView type="backgroundElement" style={[styles.section, { borderColor: theme.border }]}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Overview
          </ThemedText>
          <OverviewRow label="Application method" value={METHOD_LABEL[job.applicationMethod] ?? 'In-app'} theme={theme} />
          {job.applicationDeadline ? (
            <OverviewRow
              label="Apply by"
              value={new Date(job.applicationDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              theme={theme}
            />
          ) : null}
          {spotsRemaining != null ? (
            <OverviewRow label="Spots remaining" value={`${spotsRemaining} of ${job.maxApplicants}`} theme={theme} />
          ) : null}
        </ThemedView>

        <ThemedView type="backgroundElement" style={[styles.section, { borderColor: theme.border }]}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Description
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.description}>
            {job.description}
          </ThemedText>
        </ThemedView>

        {job.requirements.length > 0 ? (
          <ThemedView type="backgroundElement" style={[styles.section, { borderColor: theme.border }]}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              Requirements
            </ThemedText>
            {job.requirements.map((req, idx) => (
              <ThemedText key={idx} themeColor="textSecondary" style={styles.requirement}>
                ✓ {req}
              </ThemedText>
            ))}
          </ThemedView>
        ) : null}
      </ScrollView>

      <ThemedView type="backgroundElement" style={[styles.applyBar, { borderColor: theme.border }]}>
        {applyError ? (
          <ThemedText themeColor="error" type="small" style={styles.applyError}>
            {applyError}
          </ThemedText>
        ) : null}
        <ApplyAction
          job={job}
          applying={applying}
          applied={applied}
          onApply={handleApply}
          theme={theme}
        />
      </ThemedView>
    </ThemedView>
  );
}

function OverviewRow({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <ThemedView style={styles.overviewRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={{ color: theme.text }}>
        {value}
      </ThemedText>
    </ThemedView>
  );
}

function ApplyAction({
  job,
  applying,
  applied,
  onApply,
  theme,
}: {
  job: Job;
  applying: boolean;
  applied: boolean;
  onApply: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  if (job.applicationMethod === 'email' && job.applicationEmail) {
    const subject = encodeURIComponent(`SIWES Application: ${job.title}`);
    return (
      <Pressable
        onPress={() => Linking.openURL(`mailto:${job.applicationEmail}?subject=${subject}`)}
        style={[styles.applyButton, { backgroundColor: theme.primary }]}
      >
        <ThemedText style={styles.applyButtonText}>Apply via Email</ThemedText>
      </Pressable>
    );
  }

  if (job.applicationMethod === 'external' && job.applicationUrl) {
    return (
      <Pressable onPress={() => Linking.openURL(job.applicationUrl!)} style={[styles.applyButton, { backgroundColor: theme.primary }]}>
        <ThemedText style={styles.applyButtonText}>Apply on Company Site</ThemedText>
      </Pressable>
    );
  }

  if (applied) {
    return (
      <ThemedView style={[styles.applyButton, styles.appliedButton, { borderColor: theme.success }]}>
        <ThemedText themeColor="success">Application submitted ✓</ThemedText>
      </ThemedView>
    );
  }

  return (
    <Pressable
      onPress={onApply}
      disabled={applying}
      style={[styles.applyButton, { backgroundColor: theme.primary, opacity: applying ? 0.6 : 1 }]}
    >
      {applying ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.applyButtonText}>Apply Now</ThemedText>}
    </Pressable>
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
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  titleText: {
    flex: 1,
    gap: Spacing.half,
  },
  star: {
    fontSize: 24,
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
  followButton: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  section: {
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: {
    marginBottom: Spacing.half,
  },
  description: {
    lineHeight: 22,
  },
  requirement: {
    lineHeight: 20,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  applyBar: {
    padding: Spacing.three,
    borderTopWidth: 1.5,
    gap: Spacing.two,
  },
  applyError: {
    textAlign: 'center',
  },
  applyButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  appliedButton: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  applyButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
