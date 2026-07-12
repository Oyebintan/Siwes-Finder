import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PressableScale } from './pressable-scale';

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** Filter chip — filled with the brand color when active, springs on press. */
export function Chip({ label, active, onPress, icon }: ChipProps) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        active
          ? { backgroundColor: theme.primary, borderColor: theme.primary }
          : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? '#ffffff' : theme.textSecondary} /> : null}
      <ThemedText
        type="small"
        style={active ? styles.activeText : undefined}
        themeColor={active ? undefined : 'textSecondary'}
      >
        {label}
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  activeText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
