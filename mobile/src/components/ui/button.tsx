import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PressableScale } from './pressable-scale';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  /** Compact height for inline placement (e.g. inside cards). */
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The app's one button. `primary` is the brand-gradient CTA; `secondary` is
 * a bordered surface button; `ghost` is borderless; `danger` is a tinted
 * destructive button. All variants share the spring press feedback.
 */
export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, small, style }: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const contentColor =
    variant === 'primary' ? '#ffffff' : variant === 'danger' ? theme.error : variant === 'ghost' ? theme.primary : theme.text;

  const inner = (
    <>
      {loading ? (
        <ActivityIndicator color={contentColor} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 15 : 18} color={contentColor} /> : null}
          <ThemedText
            type={small ? 'smallBold' : 'default'}
            style={[styles.label, { color: contentColor }]}
            // Buttons have fixed min-heights; cap OS font scaling so the
            // label never clips at accessibility text sizes.
            maxFontSizeMultiplier={1.3}
          >
            {label}
          </ThemedText>
        </>
      )}
    </>
  );

  const sizeStyle = small ? styles.smallBody : styles.body;

  if (variant === 'primary') {
    return (
      <PressableScale onPress={onPress} disabled={isDisabled} style={[isDisabled && styles.disabled, style]}>
        <LinearGradient
          colors={[theme.gradientStart, theme.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[sizeStyle, styles.row]}
        >
          {inner}
        </LinearGradient>
      </PressableScale>
    );
  }

  const variantStyle: ViewStyle =
    variant === 'secondary'
      ? { backgroundColor: theme.backgroundElement, borderWidth: 1.5, borderColor: theme.border }
      : variant === 'danger'
        ? { backgroundColor: theme.errorSoft }
        : {};

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      style={[sizeStyle, styles.row, variantStyle, isDisabled && styles.disabled, style]}
    >
      {inner}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  body: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    minHeight: 52,
  },
  smallBody: {
    borderRadius: Radius.sm,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 38,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  label: {
    fontFamily: FontFamily.bold,
  },
  disabled: {
    opacity: 0.5,
  },
});
