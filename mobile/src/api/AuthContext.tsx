import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getBiometricEnabled, isBiometricHardwareReady } from './biometricSettings';
import { clearBackgroundedMark, hasAutoLockTimedOut } from './autoLockSettings';
import * as authStorage from './authStorage';
import * as api from './client';
import type { SessionUser } from './client';
import { registerForPushNotifications } from './pushNotifications';

type AuthState = {
  user: SessionUser | null;
  loading: boolean; // true while checking secure-store for an existing token on boot
  // True once the idle-lock timeout has elapsed for a user with biometric
  // unlock enabled -- the session/token is kept, but every screen is
  // covered by the lock overlay (see app/_layout.tsx) until unlock() runs.
  // A user WITHOUT biometric enabled never sees this; they're logged out
  // outright on timeout instead (see useIdleAutoLock/AuthContext boot check).
  locked: boolean;
  // Returns the freshly-signed-in user so a caller (e.g. signup, right
  // after auto-login) can branch on fields like emailVerified without an
  // extra round trip -- state updates from setUser aren't readable
  // synchronously in the same tick.
  login: (email: string, password: string) => Promise<SessionUser>;
  // Same shape as login(), but exchanging a Google ID token (see
  // components/ui/google-signin-button.tsx) instead of a password.
  loginWithGoogle: (idToken: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  // Re-fetches /api/profile and updates the local user snapshot -- used
  // after verifying the email so the "verify your email" banner clears
  // without requiring a fresh login.
  refreshUser: () => Promise<void>;
  // Puts the app in the locked state (idle timeout, biometric enabled).
  lock: () => void;
  // Clears the locked state after a successful biometric prompt.
  unlock: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

function toSessionUser(profile: api.Profile): SessionUser {
  return {
    id: profile._id,
    role: profile.role,
    name: profile.name,
    email: profile.email,
    emailVerified: profile.emailVerified,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  // On boot: if a token is already in secure-store from a previous
  // session, fetch the profile to confirm it's still valid and restore
  // the signed-in state -- otherwise the user re-logs-in every app launch.
  useEffect(() => {
    (async () => {
      const token = await authStorage.getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      // The app was killed/reopened after the configured auto-lock window
      // elapsed while backgrounded -- this is the path a full OS kill
      // takes (the in-memory resume path is useIdleAutoLock). A user with
      // biometric unlock enabled keeps their session but boots straight
      // into the locked state; everyone else is signed out outright,
      // same as before biometric unlock existed.
      if (await hasAutoLockTimedOut()) {
        const [biometricEnabled, hardwareReady] = await Promise.all([
          getBiometricEnabled(),
          isBiometricHardwareReady(),
        ]);
        if (biometricEnabled && hardwareReady) {
          try {
            const profile = await api.getProfile();
            setUser(toSessionUser(profile));
            setLocked(true);
            await clearBackgroundedMark();
            registerForPushNotifications().catch(() => {});
          } catch {
            await authStorage.clearToken();
          } finally {
            setLoading(false);
          }
          return;
        }
        await authStorage.clearToken();
        await clearBackgroundedMark();
        setLoading(false);
        return;
      }
      try {
        const profile = await api.getProfile();
        setUser(toSessionUser(profile));
        registerForPushNotifications().catch(() => {});
      } catch {
        // Token expired or invalid -- clear it so the login screen shows.
        await authStorage.clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      locked,
      login: async (email: string, password: string) => {
        const { token, user: sessionUser } = await api.login(email, password);
        await authStorage.setToken(token);
        setUser(sessionUser);
        registerForPushNotifications().catch(() => {});
        return sessionUser;
      },
      loginWithGoogle: async (idToken: string) => {
        const { token, user: sessionUser } = await api.googleSignIn(idToken);
        await authStorage.setToken(token);
        setUser(sessionUser);
        registerForPushNotifications().catch(() => {});
        return sessionUser;
      },
      logout: async () => {
        await authStorage.clearToken();
        await clearBackgroundedMark();
        setUser(null);
        setLocked(false);
      },
      refreshUser: async () => {
        const profile = await api.getProfile();
        setUser(toSessionUser(profile));
      },
      lock: () => setLocked(true),
      unlock: () => setLocked(false),
    }),
    [user, loading, locked]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
