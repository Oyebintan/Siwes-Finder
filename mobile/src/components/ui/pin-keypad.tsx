import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PressableScale } from './pressable-scale';

// '' renders an empty corner cell, 'back' the backspace key.
const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const;

interface PinDotsProps {
  length: number;
  filled: number;
}

/** Row of `length` dots, the first `filled` shown solid — the PIN-entry progress indicator, shared by the lock screen and the settings "set a PIN" flow. */
export function PinDots({ length, filled }: PinDotsProps) {
  const theme = useTheme();
  return (
    <View style={styles.dots}>
      {Array.from({ length }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            { borderColor: theme.border },
            index < filled && { backgroundColor: theme.primary, borderColor: theme.primary },
          ]}
        />
      ))}
    </View>
  );
}

interface PinKeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
  canBackspace?: boolean;
}

/** 12-key numeric keypad (1-9, blank, 0, backspace) — shared by the lock screen and the settings "set a PIN" flow. */
export function PinKeypad({ onDigit, onBackspace, disabled, canBackspace = true }: PinKeypadProps) {
  const theme = useTheme();
  return (
    <View style={styles.keypad}>
      {KEYPAD_KEYS.map((key, index) => {
        if (key === '') return <View key={`blank-${index}`} style={styles.keyButton} />;
        if (key === 'back') {
          return (
            <PressableScale
              key="back"
              onPress={onBackspace}
              disabled={disabled || !canBackspace}
              style={styles.keyButton}
              accessibilityRole="button"
              accessibilityLabel="Backspace"
              haptic={false}
            >
              <Ionicons name="backspace-outline" size={22} color={theme.text} />
            </PressableScale>
          );
        }
        return (
          <PressableScale
            key={key}
            onPress={() => onDigit(key)}
            disabled={disabled}
            style={[styles.keyButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            accessibilityRole="button"
            accessibilityLabel={`Digit ${key}`}
          >
            <ThemedText style={styles.keyLabel}>{key}</ThemedText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 72 * 3 + Spacing.three * 2,
    gap: Spacing.three,
    justifyContent: 'center',
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: FontFamily.semibold,
  },
});
