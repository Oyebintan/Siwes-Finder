import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FieldProps = TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Renders an eye toggle and manages secureTextEntry internally. */
  password?: boolean;
  error?: string;
  /** Shows a ×-button while there's text (search fields). */
  onClear?: () => void;
};

/**
 * The app's one text input: optional label above, leading icon, animated
 * focus ring (border fades to the brand color), and a built-in
 * show/hide-password toggle.
 */
export function Field({ label, icon, password, error, onClear, style, onFocus, onBlur, ...rest }: FieldProps) {
  const theme = useTheme();
  const [hidden, setHidden] = useState(true);
  const focus = useSharedValue(0);

  const focusStyle = useAnimatedStyle(() => ({
    borderColor: focus.value ? theme.primary : error ? theme.error : theme.border,
    // Subtle lift while focused: the ring is the border itself, animated as
    // an opacity-free color change so it stays compositor-friendly.
    shadowOpacity: withTiming(focus.value ? 0.15 : 0, { duration: 150 }),
  }));

  return (
    <View style={styles.wrap}>
      {label ? (
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      <Animated.View
        style={[
          styles.box,
          { backgroundColor: theme.backgroundElement, shadowColor: theme.primary },
          focusStyle,
        ]}
      >
        {icon ? <Ionicons name={icon} size={19} color={theme.textSecondary} style={styles.icon} /> : null}
        <TextInput
          {...rest}
          secureTextEntry={password ? hidden : rest.secureTextEntry}
          placeholderTextColor={theme.textSecondary}
          onFocus={(e) => {
            focus.value = withTiming(1, { duration: 150 });
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.value = withTiming(0, { duration: 150 });
            onBlur?.(e);
          }}
          style={[styles.input, { color: theme.text }, style]}
        />
        {onClear && !!rest.value ? (
          <Pressable
            onPress={onClear}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Clear text"
          >
            <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
          </Pressable>
        ) : null}
        {password ? (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </Animated.View>
      {error ? (
        <ThemedText type="small" themeColor="error" accessibilityRole="alert">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one + Spacing.half,
  },
  label: {
    marginLeft: Spacing.one,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    minHeight: 54,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
  },
  icon: {
    marginRight: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.three,
  },
});
