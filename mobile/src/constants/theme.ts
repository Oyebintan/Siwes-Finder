/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Ported from the web app's brand palette (src/app/globals.css) so the app
// and the site read as the same product. primary/success/warning/error
// match the web's --color-primary-500/--success/--warning/--error (light)
// and their dark-mode counterparts one-for-one.
export const Colors = {
  light: {
    text: '#0b1220',
    background: '#f6f7fa',
    backgroundElement: '#ffffff',
    backgroundSelected: '#eef0f4',
    textSecondary: '#5b6472',
    border: '#e2e6ee',
    primary: '#2557eb',
    success: '#12b76a',
    warning: '#b45309',
    error: '#dc2626',
    // Soft tints for badge/icon-circle backgrounds (≈10% alpha of the
    // semantic color on the light surface).
    primarySoft: '#e7edfd',
    successSoft: '#e2f8ee',
    warningSoft: '#fdf0e0',
    errorSoft: '#fde8e8',
    // Brand gradient (CTA buttons, hero panels). Blue → indigo, same
    // family as the web's primary.
    gradientStart: '#2557eb',
    gradientEnd: '#4338ca',
  },
  dark: {
    text: '#f3f5f8',
    background: '#07080d',
    backgroundElement: '#14171f',
    backgroundSelected: '#1c2029',
    textSecondary: '#8b93a3',
    border: '#262b36',
    primary: '#5c86ff',
    success: '#3fe6a0',
    warning: '#fbbf24',
    error: '#ff6b6b',
    primarySoft: '#1a2340',
    successSoft: '#0e2b21',
    warningSoft: '#33270d',
    errorSoft: '#3a1717',
    gradientStart: '#2557eb',
    gradientEnd: '#4338ca',
  },
} as const;

// Brand typeface. Manrope ships in the app bundle (assets/fonts, OFL
// licensed) and is loaded in app/_layout.tsx before first paint. Android
// has no faux-bold for custom fonts, so every weight is its own family —
// always set fontFamily from this map instead of fontWeight.
export const FontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

// Corner radii — one scale everywhere so surfaces read as one system.
export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// The floating pill tab bar's geometry — screens add useTabBarInset()
// (hooks/use-tab-bar-inset.ts) as bottom padding so content clears it.
export const TabBar = {
  height: 64,
  /** Gap between the pill and the bottom safe-area edge. */
  gap: 10,
} as const;

export const MaxContentWidth = 800;

// Redesign (v1.5.0) motion/gradient vocabulary. These started as tunable
// "props" in the design prototype (gradientMood/glowIntensity/motionEnergy)
// but ship here as one fixed opinionated default rather than user-facing
// Settings toggles -- the app's existing settings are all functional
// (theme override, biometric, auto-lock), not aesthetic, and there's no
// product signal yet that users want to pick their own gradient vibe.
// Kept as named constants (not inlined) so promoting one to a real setting
// later is a small change, not a rewrite.
export type GradientMood = 'classic' | 'deep' | 'electric';
export const GradientMoods: Record<GradientMood, { start: string; end: string }> = {
  classic: { start: '#2557eb', end: '#4338ca' },
  deep: { start: '#1e3a8a', end: '#4338ca' },
  electric: { start: '#2557eb', end: '#7c3aed' },
};

export type GlowIntensity = 'subtle' | 'standard' | 'bold';
export const GlowOpacity: Record<GlowIntensity, number> = {
  subtle: 0.16,
  standard: 0.32,
  bold: 0.5,
};

export type MotionEnergy = 'calm' | 'snappy' | 'bouncy';
export const MotionSpecs: Record<MotionEnergy, { damping: number; stiffness: number }> = {
  calm: { damping: 20, stiffness: 200 },
  // Matches the tab bar's existing active-icon spring -- the app's current
  // baseline feel.
  snappy: { damping: 16, stiffness: 260 },
  bouncy: { damping: 12, stiffness: 280 },
};

export const DEFAULT_GRADIENT_MOOD: GradientMood = 'deep';
export const DEFAULT_GLOW_INTENSITY: GlowIntensity = 'standard';
export const DEFAULT_MOTION_ENERGY: MotionEnergy = 'snappy';
