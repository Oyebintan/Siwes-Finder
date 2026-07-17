import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/components/ui/toast';

/**
 * App-wide connectivity strip. Slides in under the status bar while the
 * device is offline; on reconnect it slides away and a "Back online" toast
 * confirms recovery. Mounted once in the root layout, overlaying whatever
 * screen is showing.
 */
export function OfflineBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [offline, setOffline] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOffline = state.isConnected === false;
      setOffline(isOffline);
      if (isOffline) {
        wasOffline.current = true;
      } else if (wasOffline.current) {
        wasOffline.current = false;
        toast('Back online');
      }
    });
    return unsubscribe;
  }, [toast]);

  if (!offline) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      exiting={FadeOutUp.duration(200)}
      style={[styles.banner, { top: insets.top + Spacing.two, backgroundColor: theme.warningSoft }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      pointerEvents="none"
    >
      <Ionicons name="cloud-offline-outline" size={16} color={theme.warning} />
      <ThemedText type="smallBold" themeColor="warning">
        You&apos;re offline — showing the latest we have
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    // Above screens, below toasts (toast zIndex is 1000).
    zIndex: 900,
    shadowColor: '#0b1220',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
});
