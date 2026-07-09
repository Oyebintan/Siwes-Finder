'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

// Keep in sync with --background in globals.css.
const THEME_COLORS = { light: '#f6f7fa', dark: '#07080d' };

// next-themes only toggles the `class` attribute on <html> -- it doesn't
// touch the `theme-color` meta tag, so the mobile browser chrome (status
// bar / notch area / address bar tint) kept showing the wrong color after
// a manual light/dark toggle. This keeps every theme-color meta tag (the
// light- and dark-media variants from the root metadata export) pointed at
// whichever theme is actually resolved, overriding the media-query default.
export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const color = THEME_COLORS[resolvedTheme as keyof typeof THEME_COLORS] ?? THEME_COLORS.light;
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', color);
    });
  }, [resolvedTheme]);

  return null;
}
