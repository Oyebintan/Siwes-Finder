import { useEffect, useState } from 'react';
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
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { DEPARTMENTS } from '@/constants/departments';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, getProfile, updateProfile } from '@/api/client';

const LEVELS = ['300 Level', '400 Level', 'HND II'];
const DURATIONS = ['4 months', '6 months', '12 months'];
const SKILL_OPTIONS = ['React', 'Python', 'SQL', 'Figma', 'Excel', 'Node.js', 'Data Analysis', 'Networking'];
const STATES = ['Lagos', 'Abuja (FCT)', 'Rivers', 'Oyo', 'Kano', 'Any state'];

const STEP_TITLES = ['Academic details', 'SIWES duration', 'Skills', 'Preferred location'];
const STEP_SUBTITLES = [
  "Tell us where you study and what you're studying.",
  'When does your training start, and for how long?',
  "Select the skills you'd like to be matched on.",
  'Where would you like to serve your SIWES?',
];

// The one-time academic-profile wizard, mirroring the web's
// /profile-setup 4-step flow. Reached only right after a student signs
// up (see signup.tsx / verify-email.tsx) -- not a gate re-checked on
// every login, same as the web.
export default function ProfileSetupScreen() {
  const theme = useTheme();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [university, setUniversity] = useState('');
  const [course, setCourse] = useState('');
  const [level, setLevel] = useState(LEVELS[0]);
  const [startDate, setStartDate] = useState('');
  const [duration, setDuration] = useState('6 months');
  const [skills, setSkills] = useState<string[]>([]);
  const [preferredState, setPreferredState] = useState(STATES[0]);

  useEffect(() => {
    (async () => {
      try {
        const profile = await getProfile();
        if (profile.university) setUniversity(profile.university);
        if (profile.courseOfStudy) setCourse(profile.courseOfStudy);
        if (profile.level) setLevel(profile.level);
        if (profile.siwesDuration) setDuration(profile.siwesDuration);
        if (profile.preferredState) setPreferredState(profile.preferredState);
        if (profile.skills?.length) setSkills(profile.skills);
        if (profile.siwesStartDate) setStartDate(profile.siwesStartDate.slice(0, 10));
      } catch {
        // Prefill is best-effort; the wizard still works starting blank.
      }
    })();
  }, []);

  const toggleSkill = (skill: string) => {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  };

  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleNext = async () => {
    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updateProfile({
        university,
        course,
        level,
        skills,
        siwesStartDate: startDate.trim() || undefined,
        siwesDuration: duration,
        preferredState,
      });
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.progressRow}>
              {[1, 2, 3, 4].map((n) => (
                <View
                  key={n}
                  style={[styles.progressBar, { backgroundColor: n <= step ? theme.primary : theme.backgroundSelected }]}
                />
              ))}
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.stepLabel}>
              Step {step} of 4 — {STEP_TITLES[step - 1]}
            </ThemedText>

            <Animated.View
              key={step}
              entering={FadeInDown.duration(260)}
              layout={LinearTransition.springify().damping(18)}
            >
              <Card style={styles.card}>
                <ThemedText style={styles.cardTitle}>{STEP_TITLES[step - 1]}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.cardSubtitle}>
                  {STEP_SUBTITLES[step - 1]}
                </ThemedText>

                {error ? <ErrorBanner message={error} /> : null}

                {step === 1 ? (
                  <View style={styles.form}>
                    <Field label="School" value={university} onChangeText={setUniversity} placeholder="University of Lagos" />
                    <View style={styles.chipGroup}>
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        Department / course of study
                      </ThemedText>
                      <View style={styles.chipRow}>
                        {DEPARTMENTS.map((d) => (
                          <Chip key={d} label={d} active={course === d} onPress={() => setCourse(d)} />
                        ))}
                      </View>
                    </View>
                    <View style={styles.chipGroup}>
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        Level
                      </ThemedText>
                      <View style={styles.chipRow}>
                        {LEVELS.map((l) => (
                          <Chip key={l} label={l} active={level === l} onPress={() => setLevel(l)} />
                        ))}
                      </View>
                    </View>
                  </View>
                ) : null}

                {step === 2 ? (
                  <View style={styles.form}>
                    <Field
                      label="Start date"
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="e.g. 2026-09-01 (optional)"
                    />
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
                  </View>
                ) : null}

                {step === 3 ? (
                  <View style={styles.chipRow}>
                    {SKILL_OPTIONS.map((s) => (
                      <Chip key={s} label={s} active={skills.includes(s)} onPress={() => toggleSkill(s)} />
                    ))}
                  </View>
                ) : null}

                {step === 4 ? (
                  <View style={styles.form}>
                    <View style={styles.chipGroup}>
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        Preferred state
                      </ThemedText>
                      <View style={styles.chipRow}>
                        {STATES.map((s) => (
                          <Chip key={s} label={s} active={preferredState === s} onPress={() => setPreferredState(s)} />
                        ))}
                      </View>
                    </View>
                    <View style={[styles.noteBox, { backgroundColor: theme.successSoft }]}>
                      <ThemedText type="small" themeColor="success">
                        Remote-friendly opportunities are included regardless of state.
                      </ThemedText>
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
                label={step === 4 ? 'Finish & continue' : 'Continue'}
                icon="arrow-forward"
                onPress={handleNext}
                loading={saving}
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
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
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
  noteBox: {
    padding: Spacing.three,
    borderRadius: Radius.md,
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
