import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ToastTone = 'success' | 'error' | 'info';

interface ToastState {
  id: number;
  tone: ToastTone;
  message: string;
}

type ShowToast = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<ShowToast>(() => {});

/** `const toast = useToast(); toast('Saved for later')` — transient feedback. */
export function useToast(): ShowToast {
  return useContext(ToastContext);
}

const TOAST_VISIBLE_MS = 2600;

const TONE_ICON: Record<ToastTone, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

const TONE_COLOR: Record<ToastTone, ThemeColor> = {
  success: 'success',
  error: 'error',
  info: 'primary',
};

/**
 * App-wide transient feedback. One toast at a time (a newer one replaces the
 * current one), auto-dismissed, tap to dismiss early. Success/error toasts
 * fire the matching notification haptic so feedback is felt, not just seen.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const show = useCallback<ShowToast>((message, tone = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), tone, message });
    if (tone === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (tone === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
    timer.current = setTimeout(() => setToast(null), TOAST_VISIBLE_MS);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => setToast(null)} />
      ) : null}
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      entering={FadeInDown.duration(260)}
      exiting={FadeOutUp.duration(180)}
      style={[styles.wrap, { top: insets.top + Spacing.two }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onDismiss}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      >
        <Ionicons name={TONE_ICON[toast.tone]} size={20} color={theme[TONE_COLOR[toast.tone]]} />
        <ThemedText type="smallBold" style={styles.text} numberOfLines={2}>
          {toast.message}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    alignItems: 'center',
    zIndex: 1000,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 560,
    // Floating feel: a real drop shadow on both platforms.
    shadowColor: '#0b1220',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  text: {
    flexShrink: 1,
  },
});
