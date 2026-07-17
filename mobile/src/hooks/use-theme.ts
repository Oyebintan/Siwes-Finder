/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useThemeMode } from '@/api/ThemeModeContext';

export function useTheme() {
  const { effectiveScheme } = useThemeMode();
  return Colors[effectiveScheme];
}
