import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as authStorage from './authStorage';
import * as api from './client';
import type { SessionUser } from './client';
import { registerForPushNotifications } from './pushNotifications';

type AuthState = {
  user: SessionUser | null;
  loading: boolean; // true while checking secure-store for an existing token on boot
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

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
      try {
        const profile = await api.getProfile();
        setUser({ id: profile._id, role: profile.role, name: profile.name, email: profile.email });
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
      login: async (email: string, password: string) => {
        const { token, user: sessionUser } = await api.login(email, password);
        await authStorage.setToken(token);
        setUser(sessionUser);
        registerForPushNotifications().catch(() => {});
      },
      logout: async () => {
        await authStorage.clearToken();
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
