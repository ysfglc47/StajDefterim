import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ApiError,
  apiRequest,
  type RequestOptions,
} from '../../shared/api/client';
import type { Session } from './auth.api';

type Notice = 'expired' | 'logout' | null;
interface AuthContextValue {
  session: Session | null;
  notice: Notice;
  startSession: (session: Session) => void;
  logout: (notice?: Notice) => void;
  request: <T>(path: string, options?: RequestOptions) => Promise<T>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const currentToken = useRef<string | null>(null);

  const logout = useCallback((reason: Notice = null) => {
    currentToken.current = null;
    setSession(null);
    setNotice(reason);
  }, []);
  const startSession = useCallback((next: Session) => {
    currentToken.current = next.accessToken;
    setNotice(null);
    setSession(next);
  }, []);

  useEffect(() => {
    if (!session) return;
    const checkExpiry = () => {
      if (Date.now() >= session.expiresAt) logout('expired');
    };
    const timer = window.setTimeout(
      checkExpiry,
      Math.max(0, session.expiresAt - Date.now()),
    );
    window.addEventListener('focus', checkExpiry);
    document.addEventListener('visibilitychange', checkExpiry);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', checkExpiry);
      document.removeEventListener('visibilitychange', checkExpiry);
    };
  }, [session, logout]);

  const request = useCallback(
    async <T,>(path: string, options?: RequestOptions): Promise<T> => {
      const token = currentToken.current;
      if (!token) throw new ApiError(401, 'Lütfen giriş yapın.');
      try {
        return await apiRequest<T>(path, { ...options, token });
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401 &&
          currentToken.current === token
        )
          logout('expired');
        throw error;
      }
    },
    [logout],
  );

  return (
    <AuthContext.Provider
      value={{ session, notice, startSession, logout, request }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is missing.');
  return value;
}
