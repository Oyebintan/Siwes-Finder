import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing, TabBar } from '@/constants/theme';

/**
 * Bottom padding that scrollable tab screens need so their last row clears
 * the floating pill tab bar (which is absolutely positioned and lets
 * content scroll underneath it).
 */
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return TabBar.height + TabBar.gap + insets.bottom + Spacing.four;
}
