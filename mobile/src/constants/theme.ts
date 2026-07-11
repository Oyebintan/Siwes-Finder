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
  },
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
