import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { hasQuickUnlockConfigured } from './pinSettings';
import { clearBackgroundedMark, hasAutoLockTimedOut, markBackgrounded } from './autoLockSettings';
import type { SessionUser } from './client';

interface UseIdleAutoLockParams {
  user: SessionUser | null;
  logout: () => Promise<void>;
  lock: () => void;
}

/**
 * Once the app has sat backgrounded past the configured auto-lock timeout
 * (Settings -> Auto-lock, default 5 min): if the user has biometric or PIN
 * unlock configured, the app is *locked* (session kept, LockScreen overlay
 * shown -- see app/_layout.tsx) rather than signed out. Otherwise it falls
 * back to signing out entirely, same as before quick-unlock existed.
 * Elapsed time is checked on resume against a persisted timestamp rather
 * than a running timer, so it survives the JS thread being fully
 * suspended while backgrounded. The matching cold-boot check lives in
 * AuthContext, so a full app kill can't bypass this either.
 */
export function useIdleAutoLock({ user, logout, lock }: UseIdleAutoLockParams) {
  useEffect(() => {
    if (!user) return;

    const handleChange = async (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        await markBackgrounded();
        return;
      }
      if (next !== 'active') return;

      const timedOut = await hasAutoLockTimedOut();
      if (!timedOut) {
        await clearBackgroundedMark();
        return;
      }

      const quickUnlockConfigured = await hasQuickUnlockConfigured();
      await clearBackgroundedMark();
      if (quickUnlockConfigured) {
        lock();
      } else {
        await logout();
      }
    };

    const subscription = AppState.addEventListener('change', handleChange);
    return () => subscription.remove();
  }, [user, logout, lock]);
}
