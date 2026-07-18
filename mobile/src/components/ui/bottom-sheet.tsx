import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Hand-rolled bottom sheet -- React Native's own `Modal
 * animationType="slide"` drives the open/close slide, so there's no
 * separate mount/unmount state machine to build (and no fighting this
 * project's strict effect/ref lint rules over it); the backdrop gets its
 * own Reanimated fade for a touch of polish on open. No drag-to-dismiss
 * gesture: every sheet this mirrors (the jobs-feed filter panel, the
 * logbook entry composer) only ever closes via a backdrop tap or an
 * explicit button in the design, so a Pan gesture is scope the spec
 * doesn't ask for. Matches the codebase's existing hand-rolled-over-
 * library bias (onboarding-illustration.tsx, match-ring.tsx) rather than
 * pulling in a bottom-sheet package for two fixed-content,
 * single-snap-point sheets.
 */
export function BottomSheet({ visible, onClose, children, style }: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.backdropWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.backgroundElement, paddingBottom: insets.bottom + Spacing.four },
          style,
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropWrap: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 99,
    alignSelf: 'center',
  },
});
