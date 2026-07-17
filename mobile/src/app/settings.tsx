import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AUTO_LOCK_OPTIONS, getAutoLockMinutes, setAutoLockMinutes, type AutoLockMinutes } from '@/api/autoLockSettings';
import { useThemeMode } from '@/api/ThemeModeContext';
import { useToast } from '@/components/ui/toast';

const APPEARANCE_OPTIONS: { mode: 'system' | 'light' | 'dark'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
];

function SectionCard({
  icon,
  title,
  description,
  children,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  children: React.ReactNode;
  delay: number;
}) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(320).delay(delay)}>
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name={icon} size={17} color={theme.primary} />
          </View>
          <View style={styles.sectionHeaderText}>
            <ThemedText type="smallBold">{title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {description}
            </ThemedText>
          </View>
        </View>
        {children}
      </Card>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const { mode, setMode } = useThemeMode();
  const toast = useToast();

  const [autoLockMinutes, setAutoLockMinutesState] = useState<AutoLockMinutes | null>(null);

  useEffect(() => {
    getAutoLockMinutes().then(setAutoLockMinutesState);
  }, []);

  const handleAutoLockChange = async (minutes: AutoLockMinutes) => {
    setAutoLockMinutesState(minutes);
    await setAutoLockMinutes(minutes);
    toast(minutes === 0 ? 'Auto-lock turned off' : `Auto-lock set to ${minutes} min`);
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <SectionCard icon="color-palette-outline" title="Appearance" description="Choose how SIWES Finder looks on this device." delay={40}>
            <View style={styles.chipRow}>
              {APPEARANCE_OPTIONS.map((option) => (
                <Chip
                  key={option.mode}
                  label={option.label}
                  icon={option.icon}
                  active={mode === option.mode}
                  onPress={() => setMode(option.mode)}
                />
              ))}
            </View>
          </SectionCard>

          <SectionCard
            icon="lock-closed-outline"
            title="Auto-lock"
            description="Sign out automatically after the app has been in the background this long."
            delay={110}
          >
            <View style={styles.chipRow}>
              {AUTO_LOCK_OPTIONS.map((option) => (
                <Chip
                  key={option.minutes}
                  label={option.label}
                  active={autoLockMinutes === option.minutes}
                  onPress={() => handleAutoLockChange(option.minutes)}
                />
              ))}
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
              You&apos;ll sign back in with your password. Face ID / fingerprint unlock is coming in a future
              update.
            </ThemedText>
          </SectionCard>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    flex: 1,
    gap: Spacing.half,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  footnote: {
    lineHeight: 18,
  },
});
