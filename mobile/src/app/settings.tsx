import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ErrorBanner } from '@/components/ui/error-banner';
import { PinDots, PinKeypad } from '@/components/ui/pin-keypad';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AUTO_LOCK_OPTIONS, getAutoLockMinutes, setAutoLockMinutes, type AutoLockMinutes } from '@/api/autoLockSettings';
import {
  authenticateWithBiometrics,
  getBiometricEnabled,
  isBiometricHardwareReady,
  setBiometricEnabled,
} from '@/api/biometricSettings';
import { clearPin, hasPinSet, setPin as savePin } from '@/api/pinSettings';
import { useThemeMode } from '@/api/ThemeModeContext';
import { useToast } from '@/components/ui/toast';

const PIN_LENGTH = 4;
type PinStage = 'enter' | 'confirm';

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
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();
  const toast = useToast();

  const [autoLockMinutes, setAutoLockMinutesState] = useState<AutoLockMinutes | null>(null);
  const [biometricSupported, setBiometricSupported] = useState<boolean | null>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  const [pinSet, setPinSet] = useState<boolean | null>(null);
  const [pinSheetVisible, setPinSheetVisible] = useState(false);
  const [pinStage, setPinStage] = useState<PinStage>('enter');
  const [pendingPin, setPendingPin] = useState('');
  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinBusy, setPinBusy] = useState(false);

  useEffect(() => {
    getAutoLockMinutes().then(setAutoLockMinutesState);
    isBiometricHardwareReady().then(setBiometricSupported);
    getBiometricEnabled().then(setBiometricEnabledState);
    hasPinSet().then(setPinSet);
  }, []);

  const handleAutoLockChange = async (minutes: AutoLockMinutes) => {
    setAutoLockMinutesState(minutes);
    await setAutoLockMinutes(minutes);
    toast(minutes === 0 ? 'Auto-lock turned off' : `Auto-lock set to ${minutes} min`);
  };

  const handleBiometricToggle = async (next: boolean) => {
    if (!next) {
      setBiometricEnabledState(false);
      await setBiometricEnabled(false);
      toast('Biometric unlock turned off');
      return;
    }

    // Confirm biometrics actually work on this device before turning it
    // on -- otherwise a stale enrollment/permission would lock the user
    // out with no way to unlock except "use password instead" every time.
    setBiometricBusy(true);
    try {
      const verified = await authenticateWithBiometrics();
      if (verified) {
        setBiometricEnabledState(true);
        await setBiometricEnabled(true);
        toast('Biometric unlock turned on');
      } else {
        toast("Couldn't verify it's you — biometric unlock stays off.", 'error');
      }
    } finally {
      setBiometricBusy(false);
    }
  };

  const openPinSheet = () => {
    setPinStage('enter');
    setPendingPin('');
    setPinEntry('');
    setPinError('');
    setPinSheetVisible(true);
  };

  const closePinSheet = () => setPinSheetVisible(false);

  const handlePinDigit = async (digit: string) => {
    if (pinBusy || pinEntry.length >= PIN_LENGTH) return;
    setPinError('');
    const next = pinEntry + digit;
    setPinEntry(next);
    if (next.length < PIN_LENGTH) return;

    if (pinStage === 'enter') {
      setPendingPin(next);
      setPinEntry('');
      setPinStage('confirm');
      return;
    }

    if (next !== pendingPin) {
      setPinError("PINs didn't match — try again.");
      setPinStage('enter');
      setPendingPin('');
      setPinEntry('');
      return;
    }

    setPinBusy(true);
    await savePin(next);
    setPinBusy(false);
    setPinSet(true);
    setPinSheetVisible(false);
    toast('PIN set');
  };

  const handlePinBackspace = () => {
    setPinError('');
    setPinEntry((current) => current.slice(0, -1));
  };

  const handleRemovePin = () => {
    Alert.alert('Remove PIN?', "You'll need biometrics or your password to unlock after this.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await clearPin();
          setPinSet(false);
          toast('PIN removed');
        },
      },
    ]);
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
              {biometricEnabled || pinSet
                ? 'Unlock with Face ID, fingerprint, or your PIN when this triggers.'
                : "You'll sign back in with your password when this triggers."}
            </ThemedText>
          </SectionCard>

          {biometricSupported ? (
            <SectionCard
              icon="finger-print-outline"
              title="Biometric unlock"
              description="Skip re-typing your password after an auto-lock -- use Face ID, fingerprint, or your device PIN instead."
              delay={180}
            >
              <View style={styles.toggleRow}>
                <ThemedText type="small">Unlock with Face ID / fingerprint</ThemedText>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  disabled={biometricBusy}
                  trackColor={{ true: theme.primary, false: theme.backgroundSelected }}
                  thumbColor="#ffffff"
                />
              </View>
            </SectionCard>
          ) : biometricSupported === false ? (
            <SectionCard
              icon="finger-print-outline"
              title="Biometric unlock"
              description="Not available -- this device has no Face ID, fingerprint, or PIN set up yet."
              delay={180}
            >
              <ThemedText type="small" themeColor="textSecondary">
                Set up a screen lock (PIN, pattern, or biometric) in your device settings to enable this.
              </ThemedText>
            </SectionCard>
          ) : null}

          <SectionCard
            icon="keypad-outline"
            title="Quick-unlock PIN"
            description="A 4-digit backup for unlocking without biometrics -- works on any device."
            delay={250}
          >
            <View style={styles.pinRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {pinSet ? 'A PIN is set on this device.' : 'No PIN set yet.'}
              </ThemedText>
              <View style={styles.pinActions}>
                <Button label={pinSet ? 'Change PIN' : 'Set a PIN'} variant="secondary" small onPress={openPinSheet} />
                {pinSet ? <Button label="Remove" variant="danger" small onPress={handleRemovePin} /> : null}
              </View>
            </View>
          </SectionCard>
        </ScrollView>
      </SafeAreaView>

      <BottomSheet visible={pinSheetVisible} onClose={closePinSheet}>
        <ThemedText type="smallBold" style={styles.sheetTitle}>
          {pinStage === 'enter' ? 'Enter a new 4-digit PIN' : 'Confirm your PIN'}
        </ThemedText>
        {pinError ? <ErrorBanner message={pinError} /> : null}
        <View style={styles.sheetPinArea}>
          <PinDots length={PIN_LENGTH} filled={pinEntry.length} />
          <PinKeypad
            onDigit={handlePinDigit}
            onBackspace={handlePinBackspace}
            disabled={pinBusy}
            canBackspace={pinEntry.length > 0}
          />
        </View>
      </BottomSheet>
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pinRow: {
    gap: Spacing.three,
  },
  pinActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  sheetTitle: {
    textAlign: 'center',
  },
  sheetPinArea: {
    alignItems: 'center',
    gap: Spacing.four,
    paddingVertical: Spacing.two,
  },
});
