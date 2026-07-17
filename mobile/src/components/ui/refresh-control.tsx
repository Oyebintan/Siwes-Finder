import { RefreshControl, type RefreshControlProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * RefreshControl pre-tinted with the brand color on both platforms — every
 * pull-to-refresh in the app goes through this so the spinner never falls
 * back to the stock gray.
 */
export function BrandRefreshControl(props: RefreshControlProps) {
  const theme = useTheme();
  return (
    <RefreshControl
      tintColor={theme.primary}
      colors={[theme.primary]}
      progressBackgroundColor={theme.backgroundElement}
      {...props}
    />
  );
}
