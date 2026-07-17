import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { getStoredThemeMode, setStoredThemeMode, type ThemeMode } from './themeMode';

interface ThemeModeContextValue {
  /** The user's stored preference: 'system' follows the OS setting. */
  mode: ThemeMode;
  /** 'system' resolved against the current OS appearance -- what every
   *  screen should actually render with. */
  effectiveScheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

/** Wraps the app once, at the root layout, above everything theme-aware. */
export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    getStoredThemeMode().then(setModeState);
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    setStoredThemeMode(next);
  };

  const effectiveScheme: 'light' | 'dark' =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  return (
    <ThemeModeContext.Provider value={{ mode, effectiveScheme, setMode }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be called within ThemeModeProvider');
  }
  return ctx;
}
