import { useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Swipeable, { SwipeDirection, type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';

export interface SwipeAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Background color of the revealed action button. */
  color: string;
  onPress: () => void;
}

interface SwipeRowProps {
  children: ReactNode;
  /** Revealed by swiping the row left. Omit/empty to disable swiping. */
  actions: SwipeAction[];
}

const ACTION_WIDTH = 84;

/**
 * List row with swipe-to-reveal actions (swipe left → buttons on the
 * right). Tapping a revealed action fires it, ticks a haptic, and snaps
 * the row shut. Every action is also expected to be reachable by a
 * visible button elsewhere — swiping is a shortcut, never the only path.
 *
 * When there's exactly one action (e.g. the jobs feed's bookmark toggle),
 * completing the swipe itself fires that action immediately -- no extra
 * tap on the revealed button needed -- and the row springs back closed
 * right after, the same "swipe to archive" feel as Mail apps. Rows with
 * multiple actions (e.g. employer accept/reject) keep the safer
 * reveal-then-tap flow, since auto-firing would be ambiguous there.
 */
export function SwipeRow({ children, actions }: SwipeRowProps) {
  const ref = useRef<SwipeableMethods>(null);

  if (actions.length === 0) {
    return <>{children}</>;
  }

  const singleAction = actions.length === 1 ? actions[0] : null;

  const renderRightActions = (_progress: unknown, _translation: unknown, methods: SwipeableMethods) => (
    <View style={styles.actionsRow}>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            methods.close();
            action.onPress();
          }}
          style={[styles.action, { backgroundColor: action.color }]}
        >
          <Ionicons name={action.icon} size={20} color="#ffffff" />
          <ThemedText type="small" style={styles.actionLabel}>
            {action.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );

  return (
    <Swipeable
      ref={ref}
      friction={2}
      rightThreshold={36}
      overshootRight={false}
      renderRightActions={renderRightActions}
      onSwipeableOpen={(direction) => {
        if (!singleAction || direction !== SwipeDirection.RIGHT) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        singleAction.onPress();
        ref.current?.close();
      }}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingLeft: Spacing.two,
    gap: Spacing.two,
  },
  action: {
    width: ACTION_WIDTH,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  actionLabel: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bold,
  },
});
