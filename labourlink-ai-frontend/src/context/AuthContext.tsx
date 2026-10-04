import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  login as doLogin,
  workerLogin as doWorkerLogin,
  logout as doLogout,
} from '../services/authService';

import {
  getSession,
  getToken,
} from '../utils/storage';

import type {
  LoginRequest,
  Session,
} from '../types/Auth';

interface AuthState {
  session: Session | null;
  isLoggedIn: boolean;
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

  const login = useCallback(
    async (r: LoginRequest) => {
      const s = await doLogin(r);
      setSession(s);
      return s;
    },
    []
  );

  const workerLogin = useCallback(
    async (r: LoginRequest) => {
      const s = await doWorkerLogin(r);
      setSession(s);
      return s;
    },
    []
  );

  const logout = useCallback(() => {
    doLogout();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      isLoggedIn: session !== null,
      login,
      workerLogin,
      logout,
    }),
    [
      session,
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