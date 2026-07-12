import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface BrandLogoProps {
  size?: number;
  /** Render the "SIWES Finder" wordmark under the mark. */
  withWordmark?: boolean;
}

/**
 * The two-circle brand mark (same as the website favicon / app icon), drawn
 * natively: a gradient rounded square holding one solid and one outlined
 * circle, overlapping.
 */
export function BrandLogo({ size = 72, withWordmark = false }: BrandLogoProps) {
  const theme = useTheme();
  const circle = size * 0.34;

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[theme.gradientStart, theme.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.tile, { width: size, height: size, borderRadius: size * 0.3 }]}
      >
        <View style={styles.markRow}>
          <View style={[styles.solidCircle, { width: circle, height: circle, borderRadius: circle / 2 }]} />
          <View
            style={[
              styles.outlineCircle,
              {
                width: circle,
                height: circle,
                borderRadius: circle / 2,
                marginLeft: -circle * 0.35,
                borderWidth: Math.max(2, size * 0.045),
              },
            ]}
          />
        </View>
      </LinearGradient>
      {withWordmark ? (
        <ThemedText style={styles.wordmark}>
          SIWES <ThemedText style={[styles.wordmark, { color: theme.primary }]}>Finder</ThemedText>
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 12,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
  },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  solidCircle: {
    backgroundColor: '#ffffff',
  },
  outlineCircle: {
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
  },
  wordmark: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
