import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiErrorMessage, mobileApi, type ApiUser } from '@/services/mobile-api';

type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: ApiUser | null;
  bootstrapError: string | null;
  login: (email: string, password: string) => Promise<ApiUser>;
  logout: () => Promise<void>;
  retryBootstrap: () => Promise<void>;
  markPasswordChanged: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [user, setUser] = useState<ApiUser | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    setStatus('initializing');
    setBootstrapError(null);
    try {
      const restoredUser = await mobileApi.restoreSession();
      setUser(restoredUser);
      setStatus(restoredUser ? 'authenticated' : 'unauthenticated');
    } catch (error) {
      setUser(null);
      setBootstrapError(apiErrorMessage(error));
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    bootstrap().catch(() => undefined);
  }, [bootstrap]);

  useEffect(() => {
    mobileApi.setSessionExpiredHandler(() => {
      setUser(null);
      setStatus('unauthenticated');
    });
    // O servidor bloqueia as rotas de dados com 403 PASSWORD_CHANGE_REQUIRED
    // enquanto mustChangePassword estiver ativo; o guard de navegação reage à flag.
    mobileApi.setPasswordChangeRequiredHandler(() => {
      setUser((current) =>
        current && !current.mustChangePassword ? { ...current, mustChangePassword: true } : current,
      );
    });
    return () => {
      mobileApi.setSessionExpiredHandler(null);
      mobileApi.setPasswordChangeRequiredHandler(null);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const authenticatedUser = await mobileApi.login(email, password);
    setUser(authenticatedUser);
    setStatus('authenticated');
    setBootstrapError(null);
    return authenticatedUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await mobileApi.logout();
    } finally {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const markPasswordChanged = useCallback(() => {
    setUser((current) =>
      current && current.mustChangePassword ? { ...current, mustChangePassword: false } : current,
    );
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    bootstrapError,
    login,
    logout,
    retryBootstrap: bootstrap,
    markPasswordChanged,
  }), [bootstrap, bootstrapError, login, logout, markPasswordChanged, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
