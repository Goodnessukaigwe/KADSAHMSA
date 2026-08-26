import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { LoginInput, Permission, PublicUser, RegisterInput } from '@kadsamhsa/domain';
import { api, setUnauthenticatedHandler } from '../data/api';

interface AuthContextValue {
  user: PublicUser | null;
  /** True until the initial session-restore attempt settles. */
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  /** Resolves once local state is cleared, reporting whether the server confirmed. */
  logout: () => Promise<{ serverConfirmed: boolean }>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Holds the signed-in user for the app.
 *
 * The access token stays inside the ApiClient — deliberately not in state and
 * not in localStorage. On load, the client tries the refresh cookie once; if
 * that fails the visitor is simply anonymous, which is a valid state for every
 * public page.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUnauthenticatedHandler(() => setUser(null));

    let active = true;
    api
      .restoreSession()
      .then((restored) => {
        if (active) {
          setUser(restored);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const session = await api.login(input);
    api.setAccessToken(session.accessToken);
    setUser(session.user);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const session = await api.register(input);
    api.setAccessToken(session.accessToken);
    setUser(session.user);
  }, []);

  /**
   * Signs out locally no matter what the server says. `api.logout()` swallows
   * transport failures and always drops the token, so the UI can never be left
   * showing a signed-in state the user explicitly ended.
   */
  const logout = useCallback(async () => {
    const { serverConfirmed } = await api.logout();
    setUser(null);
    return { serverConfirmed };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      // Mirrors the API's check so the UI can hide what a request would refuse.
      // The server's check is the one that matters.
      can: (permission) => user?.permissions.includes(permission) ?? false,
    }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
