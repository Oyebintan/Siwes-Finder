import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Field } from '@/components/ui/field';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useToast } from '@/components/ui/toast';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { DEPARTMENTS } from '@/constants/departments';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, createJob, type JobPostInput } from '@/api/client';

const TYPES: JobPostInput['type'][] = ['On-site', 'Remote', 'Hybrid'];
const DURATIONS = ['4 months', '6 months', '12 months'];
const SKILL_OPTIONS = ['React', 'Python', 'SQL', 'Figma', 'Excel', 'Node.js', 'Data Analysis', 'Networking'];
const APPLICATION_METHODS: { key: JobPostInput['applicationMethod']; label: string }[] = [
  { key: 'platform', label: 'On this platform' },
  { key: 'email', label: 'By email' },
  { key: 'external', label: 'External link' },
];

const STEP_TITLES = ['Basics', 'Role details', 'Application & publish'];
const STEP_SUBTITLES = [
  'Where and how long is this placement?',
  'Describe the placement so students can evaluate the fit.',
  'Choose how students apply, then review and publish.',
];

// Mirrors the web's /employer/post-job 3-step wizard (same field set, same
// POST /api/jobs contract) -- reached from the Employer Dashboard's
// "+ Post a job" CTA, the one write path the mobile employer experience
// was missing. Required skills use the same fixed chip vocabulary as the
// student profile wizard (SKILL_OPTIONS) instead of the web's free-text
// tag input, matching this app's chip-based-selection convention.
export default function PostJobScreen() {
  const theme = useTheme();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<JobPostInput['type']>('On-site');
  const [duration, setDuration] = useState('6 months');
  const [department, setDepartment] = useState('');
  const [stipend, setStipend] = useState('');

  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState<string[]>([]);

  const [applicationMethod, setApplicationMethod] = useState<JobPostInput['applicationMethod']>('platform');
  const [applicationEmail, setApplicationEmail] = useState('');
  const [applicationUrl, setApplicationUrl] = useState('');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [maxApplicants, setMaxApplicants] = useState('');

  const toggleSkill = (skill: string) => {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  };

  const canContinueStep1 = title.trim() && location.trim() && department;
  const canContinueStep2 = description.trim() && skills.length > 0;

  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleContinue = () => {
    setError('');
    if (step === 1 && !canContinueStep1) {
      setError('Fill in the opportunity title, location, and department.');
      return;
    }
    if (step === 2 && !canContinueStep2) {
      setError('Add a description and at least one required skill.');
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const handlePublish = async () => {
    setError('');
    if (applicationMethod === 'email' && !applicationEmail.trim()) {
      setError('Provide an application email.');
      return;
    }
    if (applicationMethod === 'external' && !applicationUrl.trim()) {
      setError('Provide an application URL.');
      return;
    }

    setPublishing(true);
    try {
      await createJob({
        title: title.trim(),
        location: location.trim(),
        type,
        duration,
        department,
        stipend: stipend.trim() || undefined,
        description: description.trim(),
        requirements: skills,
        applicationMethod,
        applicationEmail: applicationMethod === 'email' ? applicationEmail.trim() : undefined,
        applicationUrl: applicationMethod === 'external' ? applicationUrl.trim() : undefined,
        applicationDeadline: applicationDeadline.trim() || undefined,
        maxApplicants: maxApplicants.trim() ? Number(maxApplicants.trim()) : undefined,
      });
      toast('Opportunity posted 🎉');
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post this opportunity. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.progressRow}>
              {[1, 2, 3].map((n) => (
                <View
                  key={n}
                  style={[styles.progressBar, { backgroundColor: n <= step ? theme.primary : theme.backgroundSelected }]}
                />
              ))}
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.stepLabel}>
              Step {step} of 3 — {STEP_TITLES[step - 1]}
            </ThemedText>

            <Animated.View key={step} entering={FadeInDown.duration(260)} layout={LinearTransition.springify().damping(18)}>
              <Card style={styles.card}>
                <ThemedText style={styles.cardTitle}>{STEP_TITLES[step - 1]}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.cardSubtitle}>
                  {STEP_SUBTITLES[step - 1]}
                </ThemedText>

                {error ? <ErrorBanner message={error} /> : null}

                {step === 1 ? (
                  <View style={styles.form}>
                    <Field label="Opportunity title" value={title} onChangeText={setTitle} placeholder="Frontend Engineering Intern" />
                    <Field label="Location" value={location} onChangeText={setLocation} placeholder="Lagos, Nigeria" />
                    <View style={styles.chipGroup}>
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        Work type
                      </ThemedText>
                      <View style={styles.chipRow}>
                        {TYPES.map((t) => (
                          <Chip key={t} label={t} active={type === t} onPress={() => setType(t)} />
                        ))}
                      </View>
                    </View>
                    <View style={styles.chipGroup}>
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        Duration
                      </ThemedText>
                      <View style={styles.chipRow}>
                        {DURATIONS.map((d) => (
                          <Chip key={d} label={d} active={duration === d} onPress={() => setDuration(d)} />
                        ))}
                      </View>
                    </View>
                    <View style={styles.chipGroup}>
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        Department
                      </ThemedText>
                      <View style={styles.chipRow}>
                        {DEPARTMENTS.map((d) => (
                          <Chip key={d} label={d} active={department === d} onPress={() => setDepartment(d)} />
                        ))}
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        Students mainly see opportunities from their own department by default.
                      </ThemedText>
                    </View>
                    <Field label="Stipend (optional)" value={stipend} onChangeText={setStipend} placeholder="₦50,000" />
                  </View>
                ) : null}

                {step === 2 ? (
                  <View style={styles.form}>
                    <Field
                      label="Description"
                      value={description}
                      onChangeText={setDescription}
                      placeholder="What will the intern work on?"
                      multiline
                      numberOfLines={4}
                      style={styles.textArea}
                    />
                    <View style={styles.chipGroup}>
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        Required skills
                      </ThemedText>
                      <View style={styles.chipRow}>
                        {SKILL_OPTIONS.map((s) => (
                          <Chip key={s} label={s} active={skills.includes(s)} onPress={() => toggleSkill(s)} />
                        ))}
                      </View>
                    </View>
                  </View>
                ) : null}

                {step === 3 ? (
                  <View style={styles.form}>
                    <View style={styles.chipGroup}>
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        How should students apply?
                      </ThemedText>
                      <View style={styles.chipRow}>
                        {APPLICATION_METHODS.map((m) => (
                          <Chip key={m.key} label={m.label} active={applicationMethod === m.key} onPress={() => setApplicationMethod(m.key)} />
                        ))}
                      </View>
                    </View>
                    {applicationMethod === 'email' ? (
                      <Field
                        label="Application email"
                        value={applicationEmail}
                        onChangeText={setApplicationEmail}
                        placeholder="careers@company.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    ) : null}
                    {applicationMethod === 'external' ? (
                      <Field
                        label="External application URL"
                        value={applicationUrl}
                        onChangeText={setApplicationUrl}
                        placeholder="https://company.com/careers/apply"
                        keyboardType="url"
                        autoCapitalize="none"
                      />
                    ) : null}
                    <Field
                      label="Application deadline (optional)"
                      value={applicationDeadline}
                      onChangeText={setApplicationDeadline}
                      placeholder="e.g. 2026-09-01"
                    />
                    <Field
                      label="Max applicants (optional)"
                      value={maxApplicants}
                      onChangeText={setMaxApplicants}
                      placeholder="e.g. 20"
                      keyboardType="number-pad"
                    />
                    <ThemedText type="small" themeColor="textSecondary">
                      Leave either blank for no limit. Once the deadline passes or the applicant cap is reached, the listing closes automatically.
                    </ThemedText>

                    <View style={[styles.reviewBox, { backgroundColor: theme.background }]}>
                      <ThemedText type="smallBold">{title || 'Untitled opportunity'}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {[location, type, duration].filter(Boolean).join(' · ')}
                      </ThemedText>
                      {department ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          Department: {department}
                        </ThemedText>
                      ) : null}
                      {skills.length > 0 ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          Skills: {skills.join(', ')}
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </Card>
            </Animated.View>

            <View style={styles.footer}>
              {step > 1 ? (
                <PressableScale onPress={handleBack} style={styles.backButton} haptic={false}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Back
                  </ThemedText>
                </PressableScale>
              ) : (
                <View style={styles.backButton} />
              )}
              <Button
                label={step === 3 ? 'Publish' : 'Continue'}
                icon={step === 3 ? 'checkmark-circle-outline' : 'arrow-forward'}
                onPress={step === 3 ? handlePublish : handleContinue}
                loading={publishing}
                style={styles.nextButton}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  progressRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  progressBar: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  stepLabel: {
    marginBottom: Spacing.one,
  },
  card: {
    gap: Spacing.three,
  },
  cardTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: FontFamily.extrabold,
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    marginTop: -Spacing.two,
  },
  form: {
    gap: Spacing.three,
  },
  chipGroup: {
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  reviewBox: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    gap: Spacing.half,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  backButton: {
    minWidth: 56,
    paddingVertical: Spacing.three,
  },
  nextButton: {
    flex: 1,
  },
});
