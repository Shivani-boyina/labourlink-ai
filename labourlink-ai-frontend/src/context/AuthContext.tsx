import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

import {
  login as doLogin,
  workerLogin as doWorkerLogin,
  getCurrentSession,
  logout as doLogout,
} from '../services/authService';
import { ApiError } from '../services/api';

import {
  getSession,
  getToken,
  setSession as persistSession,
} from '../utils/storage';

import type {
  LoginRequest,
  Session,
} from '../types/Auth';

interface AuthState {
  session: Session | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  authStatus: 'checking' | 'authenticated' | 'anonymous' | 'unavailable';
  retryAuthCheck: () => Promise<void>;
  login: (
    r: LoginRequest
  ) => Promise<Session>;
  workerLogin: (
    r: LoginRequest
  ) => Promise<Session>;
  logout: () => void;
}

const Ctx =
  createContext<AuthState | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] =
    useState<Session | null>(
      () =>
        getToken()
          ? getSession()
          : null
    );
  const [authStatus, setAuthStatus] = useState<AuthState['authStatus']>(
    () => getToken() ? 'checking' : 'anonymous'
  );
  const validationRef = useRef<Promise<void> | null>(null);
  const revisionRef = useRef(0);

  const retryAuthCheck = useCallback((): Promise<void> => {
    const token = getToken();
    if (!token) {
      revisionRef.current += 1;
      doLogout();
      setSession(null);
      setAuthStatus('anonymous');
      return Promise.resolve();
    }
    if (validationRef.current) return validationRef.current;

    const revision = revisionRef.current;
    setAuthStatus('checking');
    const validation = getCurrentSession()
      .then((currentSession) => {
        if (revisionRef.current !== revision) return;
        persistSession(currentSession);
        setSession(currentSession);
        setAuthStatus('authenticated');
      })
      .catch((error: unknown) => {
        if (revisionRef.current !== revision) return;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          doLogout();
          setSession(null);
          setAuthStatus('anonymous');
          return;
        }
        // Keep the cached session and token on network/server errors. The user
        // can continue seeing their role-specific UI and retry verification.
        setAuthStatus('unavailable');
      })
      .finally(() => {
        if (validationRef.current === validation) validationRef.current = null;
      });
    validationRef.current = validation;
    return validation;
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setSession(null);
      setAuthStatus('anonymous');
      return;
    }
    void retryAuthCheck();
  }, [retryAuthCheck]);

  const login = useCallback(
    async (r: LoginRequest) => {
      const s = await doLogin(r);
      revisionRef.current += 1;
      validationRef.current = null;
      setSession(s);
      setAuthStatus('authenticated');
      return s;
    },
    []
  );

  const workerLogin = useCallback(
    async (r: LoginRequest) => {
      const s = await doWorkerLogin(r);
      revisionRef.current += 1;
      validationRef.current = null;
      setSession(s);
      setAuthStatus('authenticated');
      return s;
    },
    []
  );

  const logout = useCallback(() => {
    revisionRef.current += 1;
    validationRef.current = null;
    doLogout();
    setSession(null);
    setAuthStatus('anonymous');
  }, []);

  const value = useMemo(
    () => ({
      session,
      isLoggedIn: session !== null,
      isLoading: authStatus === 'checking',
      authStatus,
      retryAuthCheck,
      login,
      workerLogin,
      logout,
    }),
    [
      session,
      authStatus,
      retryAuthCheck,
      login,
      workerLogin,
      logout,
    ]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);

  if (!v) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return v;
}
