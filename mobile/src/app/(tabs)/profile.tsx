import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/api/AuthContext';
import { ApiError, getProfile, updateProfile, uploadFile } from '@/api/client';

const SKILL_OPTIONS = ['React', 'Python', 'SQL', 'Figma', 'Excel', 'Node.js', 'Data Analysis', 'Networking'];
const STATES = ['Lagos', 'Abuja (FCT)', 'Rivers', 'Oyo', 'Kano', 'Any state'];
const LEVELS = ['300 Level', '400 Level', 'HND II'];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
}

export default function ProfileScreen() {
  const theme = useTheme();
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
  const [success, setSuccess] = useState(false);
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload your resume.');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSave = async () => {
    setSavingText(true);
    setError('');
    setSuccess(false);
    try {
      await updateProfile({ name, phone, university, faculty, course, level, preferredState, skills });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile. Check your connection.');
    } finally {
      setSavingText(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.headerTitle}>
            Profile
          </ThemedText>

          {success ? (
            <ThemedView type="backgroundElement" style={[styles.banner, { borderColor: theme.success }]}>
              <ThemedText themeColor="success" type="small">
                Profile updated successfully.
              </ThemedText>
            </ThemedView>
          ) : null}
          {error ? (
            <ThemedView type="backgroundElement" style={[styles.banner, { borderColor: theme.error }]}>
              <ThemedText themeColor="error" type="small">
                {error}
              </ThemedText>
            </ThemedView>
          ) : null}

          <ThemedView style={styles.avatarRow}>
            <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar} style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <ThemedView style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold" themeColor="primary">
                    {initials(name || user?.name || '?')}
                  </ThemedText>
                </ThemedView>
              )}
              {uploadingAvatar ? (
                <ThemedView style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" size="small" />
                </ThemedView>
              ) : null}
            </Pressable>
            <ThemedView style={styles.avatarText}>
              <ThemedText type="smallBold">{name || 'Your name'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {[course, university].filter(Boolean).join(' · ') || 'Complete your academic details below'}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <Field label="Full name" theme={theme}>
            <TextInput
              value={name}
              onChangeText={setName}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
            />
          </Field>
          <Field label="Phone" theme={theme}>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+234 800 000 0000"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
            />
          </Field>
          <Field label="University / Institution" theme={theme}>
            <TextInput
              value={university}
              onChangeText={setUniversity}
              placeholder="University of Lagos"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
            />
          </Field>
          <Field label="Faculty" theme={theme}>
            <TextInput
              value={faculty}
              onChangeText={setFaculty}
              placeholder="Faculty of Science"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
            />
          </Field>
          <Field label="Course of study" theme={theme}>
            <TextInput
              value={course}
              onChangeText={setCourse}
              placeholder="Computer Science"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
            />
          </Field>

          <Field label="Level" theme={theme}>
            <ThemedView style={styles.chipRow}>
              {LEVELS.map((l) => (
                <Chip key={l} label={l} active={level === l} onPress={() => setLevel(l)} theme={theme} />
              ))}
            </ThemedView>
          </Field>

          <Field label="Preferred state" theme={theme}>
            <ThemedView style={styles.chipRow}>
              {STATES.map((s) => (
                <Chip key={s} label={s} active={preferredState === s} onPress={() => setPreferredState(s)} theme={theme} />
              ))}
            </ThemedView>
          </Field>

          <Field label="Skills" theme={theme}>
            <ThemedView style={styles.chipRow}>
              {SKILL_OPTIONS.map((s) => (
                <Chip key={s} label={s} active={skills.includes(s)} onPress={() => toggleSkill(s)} theme={theme} />
              ))}
            </ThemedView>
          </Field>

          <Field label="Resume" theme={theme}>
            <Pressable
              onPress={handlePickResume}
              disabled={uploadingResume}
              style={[styles.resumeBox, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
            >
              {uploadingResume ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <>
                  <ThemedText type="small">{resumeUrl ? 'Resume uploaded — tap to replace' : 'No resume uploaded yet'}</ThemedText>
                  <ThemedText type="small" themeColor="primary">
                    {resumeUrl ? 'Replace resume' : 'Upload resume'}
                  </ThemedText>
                </>
              )}
            </Pressable>
          </Field>

          <Pressable
            onPress={handleSave}
            disabled={savingText}
            style={[styles.saveButton, { backgroundColor: theme.primary, opacity: savingText ? 0.6 : 1 }]}
          >
            {savingText ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.saveButtonText}>Save changes</ThemedText>}
          </Pressable>

          <Pressable
            onPress={async () => {
              await logout();
              router.replace('/login');
            }}
            style={[styles.signOutButton, { borderColor: theme.border }]}
          >
            <ThemedText themeColor="error">Sign out</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Field({ label, theme, children }: { label: string; theme: ReturnType<typeof useTheme>; children: React.ReactNode }) {
  return (
    <ThemedView style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
      {children}
    </ThemedView>
  );
}

function Chip({ label, active, onPress, theme }: { label: string; active: boolean; onPress: () => void; theme: ReturnType<typeof useTheme> }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: theme.border, backgroundColor: active ? theme.primary : theme.backgroundElement }]}
    >
      <ThemedText type="small" style={active ? styles.chipTextActive : undefined} themeColor={active ? undefined : 'textSecondary'}>
        {label}
      </ThemedText>
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
  },
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  banner: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatarWrap: {
    width: 64,
    height: 64,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  avatarText: {
    flex: 1,
    gap: Spacing.half,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    borderWidth: 1.5,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  resumeBox: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.half,
  },
  saveButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  signOutButton: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
