import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useScrollToTop } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Field } from '@/components/ui/field';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';
import { confirmSignOut } from '@/api/confirmSignOut';
import { ApiError, getProfile, updateProfile, uploadFile } from '@/api/client';

const SKILL_OPTIONS = ['React', 'Python', 'SQL', 'Figma', 'Excel', 'Node.js', 'Data Analysis', 'Networking'];
const STATES = ['Lagos', 'Abuja (FCT)', 'Rivers', 'Oyo', 'Kano', 'Any state'];
const LEVELS = ['300 Level', '400 Level', 'HND II'];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
}

export default function ProfileScreen() {
  const tabBarInset = useTabBarInset();
  // Re-pressing the active tab scrolls this screen back to the top.
  const scrollTopRef = useRef<ScrollView>(null);
  useScrollToTop(scrollTopRef);
  const theme = useTheme();
  const toast = useToast();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [university, setUniversity] = useState('');
  const [faculty, setFaculty] = useState('');
  const [course, setCourse] = useState('');
  const [level, setLevel] = useState('');
  const [preferredState, setPreferredState] = useState(STATES[0]);
  const [skills, setSkills] = useState<string[]>([]);
  const [resumeUrl, setResumeUrl] = useState('');

  const [savingText, setSavingText] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const profile = await getProfile();
        setName(profile.name || '');
        setPhone(profile.phone || '');
        setAvatarUrl(profile.avatarUrl || '');
        setUniversity(profile.university || '');
        setFaculty(profile.faculty || '');
        setCourse(profile.courseOfStudy || '');
        setLevel(profile.level || '');
        setPreferredState(profile.preferredState || STATES[0]);
        setSkills(Array.isArray(profile.skills) ? profile.skills : []);
        setResumeUrl(profile.resumeUrl || '');
      } catch {
        // Session cookie/token is still valid (this screen is behind the tab
        // auth gate) -- a failed fetch here is a transient network issue, so
        // just leave the form at its defaults rather than block the screen.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleSkill = (skill: string) => {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  };

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is needed to change your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    setError('');
    try {
      const { url } = await uploadFile(
        { uri: asset.uri, name: asset.fileName || 'avatar.jpg', type: asset.mimeType || 'image/jpeg' },
        'avatar'
      );
      await updateProfile({ avatarUrl: url });
      setAvatarUrl(url);
      toast('Profile photo updated');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload your photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePickResume = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploadingResume(true);
    setError('');
    try {
      const { url } = await uploadFile({ uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/pdf' }, 'resume');
      await updateProfile({ resumeLink: url });
      setResumeUrl(url);
      toast('Resume uploaded');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload your resume.');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSave = async () => {
    setSavingText(true);
    setError('');
    try {
      await updateProfile({ name, phone, university, faculty, course, level, preferredState, skills });
      toast('Profile updated');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile. Check your connection.');
    } finally {
      setSavingText(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View style={styles.loadingWrap}>
            <Skeleton width={120} height={120} radius={60} />
            <Skeleton width="60%" height={18} />
            <Skeleton width="80%" height={54} radius={Radius.md} />
            <Skeleton width="80%" height={54} radius={Radius.md} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: tabBarInset }]} keyboardShouldPersistTaps="handled">
          {/* Gradient identity header — avatar over the brand gradient. */}
          <Animated.View entering={FadeInDown.duration(350)}>
            <LinearGradient
              colors={[theme.gradientStart, theme.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <PressableScale onPress={handlePickAvatar} disabled={uploadingAvatar} style={styles.avatarWrap}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} transition={150} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <ThemedText style={styles.avatarInitials}>{initials(name || user?.name || '?')}</ThemedText>
                  </View>
                )}
                {uploadingAvatar ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                ) : (
                  <View style={[styles.avatarEdit, { backgroundColor: theme.backgroundElement }]}>
                    <Ionicons name="camera" size={13} color={theme.primary} />
                  </View>
                )}
              </PressableScale>
              <ThemedText style={styles.heroName}>{name || 'Your name'}</ThemedText>
              <ThemedText style={styles.heroMeta}>
                {[course, university].filter(Boolean).join(' · ') || 'Complete your academic details below'}
              </ThemedText>
            </LinearGradient>
          </Animated.View>

          {error ? <ErrorBanner message={error} /> : null}

          <Animated.View entering={FadeInDown.duration(350).delay(80)}>
            <Card style={styles.section}>
              <SectionTitle icon="person-outline" title="Personal" />
              <Field label="Full name" value={name} onChangeText={setName} />
              <Field
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="+234 800 000 0000"
                keyboardType="phone-pad"
              />
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(140)}>
            <Card style={styles.section}>
              <SectionTitle icon="school-outline" title="Academic" />
              <Field label="University / Institution" value={university} onChangeText={setUniversity} placeholder="University of Lagos" />
              <Field label="Faculty" value={faculty} onChangeText={setFaculty} placeholder="Faculty of Science" />
              <Field label="Course of study" value={course} onChangeText={setCourse} placeholder="Computer Science" />
              <ThemedText type="smallBold" themeColor="textSecondary">
                Level
              </ThemedText>
              <View style={styles.chipRow}>
                {LEVELS.map((l) => (
                  <Chip key={l} label={l} active={level === l} onPress={() => setLevel(l)} />
                ))}
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(200)}>
            <Card style={styles.section}>
              <SectionTitle icon="options-outline" title="Placement preferences" />
              <ThemedText type="smallBold" themeColor="textSecondary">
                Preferred state
              </ThemedText>
              <View style={styles.chipRow}>
                {STATES.map((s) => (
                  <Chip key={s} label={s} active={preferredState === s} onPress={() => setPreferredState(s)} />
                ))}
              </View>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Skills
              </ThemedText>
              <View style={styles.chipRow}>
                {SKILL_OPTIONS.map((s) => (
                  <Chip key={s} label={s} active={skills.includes(s)} onPress={() => toggleSkill(s)} />
                ))}
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(260)}>
            <Card style={styles.section}>
              <SectionTitle icon="document-text-outline" title="Resume" />
              <PressableScale
                onPress={handlePickResume}
                disabled={uploadingResume}
                style={[styles.resumeBox, { borderColor: theme.border, backgroundColor: theme.background }]}
              >
                {uploadingResume ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <>
                    <Ionicons
                      name={resumeUrl ? 'document-attach' : 'cloud-upload-outline'}
                      size={22}
                      color={theme.primary}
                    />
                    <ThemedText type="small" themeColor="textSecondary">
                      {resumeUrl ? 'Resume uploaded — tap to replace' : 'Upload your resume (PDF)'}
                    </ThemedText>
                  </>
                )}
              </PressableScale>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(320)} style={styles.actions}>
            <Button label="Save changes" icon="checkmark" onPress={handleSave} loading={savingText} />
            <Button
              label="Sign out"
              icon="log-out-outline"
              variant="danger"
              onPress={() =>
                confirmSignOut(async () => {
                  await logout();
                  router.replace('/login');
                })
              }
            />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionTitle}>
      <View style={[styles.sectionIcon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name={icon} size={15} color={theme.primary} />
      </View>
      <ThemedText type="smallBold">{title}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Radius.xl,
  },
  avatarWrap: {
    width: 84,
    height: 84,
    marginBottom: Spacing.two,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  avatarInitials: {
    color: '#ffffff',
    fontFamily: FontFamily.extrabold,
    fontSize: 26,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  avatarEdit: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    color: '#ffffff',
    fontFamily: FontFamily.extrabold,
    fontSize: 20,
    lineHeight: 26,
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  section: {
    gap: Spacing.three,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  resumeBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  actions: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
});
