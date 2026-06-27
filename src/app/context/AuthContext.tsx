import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { loginUser, loginWithGoogle, registerUser, type AuthSession } from '../lib/authApi';
import type { UserProfile } from '../lib/types';

const STORAGE_KEY = 'chatapp-frontend-auth-session';

type StoredSession = {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
};

function loadStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function saveStoredSession(session: StoredSession | null) {
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

type AuthContextValue = {
  user: UserProfile | null;
  userId: string;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { email: string; password: string; displayName: string }) => Promise<void>;
  loginGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => loadStoredSession());

  const applySession = useCallback((next: AuthSession) => {
    if (!next.user) {
      throw new Error('Server response is missing user profile');
    }
    const stored: StoredSession = {
      accessToken: next.accessToken,
      refreshToken: next.refreshToken,
      user: next.user,
    };
    setSession(stored);
    saveStoredSession(stored);
  }, []);

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const result = await loginUser(input);
      applySession(result);
    },
    [applySession],
  );

  const register = useCallback(
    async (input: { email: string; password: string; displayName: string }) => {
      const result = await registerUser(input);
      applySession(result);
    },
    [applySession],
  );

  const loginGoogle = useCallback(
    async (idToken: string) => {
      const result = await loginWithGoogle(idToken);
      applySession(result);
    },
    [applySession],
  );

  const logout = useCallback(() => {
    setSession(null);
    saveStoredSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      userId: session?.user.id ?? '',
      accessToken: session?.accessToken ?? null,
      isAuthenticated: session != null,
      login,
      register,
      loginGoogle,
      logout,
    }),
    [session, login, register, loginGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
