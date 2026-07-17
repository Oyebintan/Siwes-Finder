import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { clearBackgroundedMark, hasAutoLockTimedOut, markBackgrounded } from './autoLockSettings';
import type { SessionUser } from './client';

interface UseIdleAutoLockParams {
  user: SessionUser | null;
  logout: () => Promise<void>;
}

/**
 * Signs the user out once the app has sat backgrounded past their
 * configured auto-lock timeout (Settings -> Auto-lock, default 5 min).
 * Elapsed time is checked on resume against a persisted timestamp rather
 * than a running timer, so it survives the JS thread being fully
 * suspended while backgrounded. The matching cold-boot check lives in
 * AuthContext, so a full app kill can't bypass this either.
 */
export function useIdleAutoLock({ user, logout }: UseIdleAutoLockParams) {
  useEffect(() => {
    if (!user) return;

    const handleChange = async (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        await markBackgrounded();
        return;
      }
      if (next !== 'active') return;

      const timedOut = await hasAutoLockTimedOut();
      await clearBackgroundedMark();
      if (timedOut) {
        await logout();
      }
    };

    const subscription = AppState.addEventListener('change', handleChange);
    return () => subscription.remove();
  }, [user, logout]);
}
