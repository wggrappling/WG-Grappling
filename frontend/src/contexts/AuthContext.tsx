import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { tokenStorage, unauthorizedEventName } from '../api';
import { authService } from '../services';
import type { AuthUser, LoginCredentials } from '../types';

export type AuthContextValue = {
  user: AuthUser | null;
  authenticated: boolean;
  initializing: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const authenticatedUser = await authService.login(credentials);
    setUser(authenticatedUser);
  }, []);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      if (!tokenStorage.get()) {
        setInitializing(false);
        return;
      }

      try {
        const authenticatedUser = await authService.getCurrentUser();
        if (active) setUser(authenticatedUser);
      } catch {
        if (active) logout();
      } finally {
        if (active) setInitializing(false);
      }
    };

    const handleUnauthorized = () => {
      if (active) setUser(null);
    };

    window.addEventListener(unauthorizedEventName, handleUnauthorized);
    void restoreSession();

    return () => {
      active = false;
      window.removeEventListener(unauthorizedEventName, handleUnauthorized);
    };
  }, [logout]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    authenticated: Boolean(user),
    initializing,
    login,
    logout,
  }), [initializing, login, logout, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
