
import type { Session } from '../types/Auth';
import type { Worker } from '../types/Worker';

const TOKEN_KEY = 'll_token';
const SESSION_KEY = 'll_session';
const WORKER_PROFILE_KEY = 'll_worker_profile';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage unavailable
  }
}

export const getToken = (): string | null => read(TOKEN_KEY);

export const setToken = (token: string): void => {
  write(TOKEN_KEY, token);
};

export function getSession(): Session | null {
  const raw = read(SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    const session: unknown = JSON.parse(raw);

    if (
      typeof session !== 'object' ||
      session === null
    ) {
      return null;
    }

    if (
      !('userId' in session) ||
      typeof session.userId !== 'number' ||
      !Number.isSafeInteger(session.userId) ||
      session.userId <= 0
    ) {
      return null;
    }

    if (
      !('phone' in session) ||
      typeof session.phone !== 'string' ||
      session.phone.trim() === ''
    ) {
      return null;
    }

    if (
      !('name' in session) ||
      typeof session.name !== 'string'
    ) {
      return null;
    }

    if (
      !('role' in session) ||
      (session.role !== 'worker' &&
        session.role !== 'contractor')
    ) {
      return null;
    }

    return {
      userId: session.userId,
      phone: session.phone,
      name: session.name,
      role: session.role,
    };
  } catch {
    return null;
  }
}

export const setSession = (session: Session): void => {
  write(SESSION_KEY, JSON.stringify(session));
};

export function getWorkerProfile(): Worker | null {
  const raw = read(WORKER_PROFILE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Worker;
  } catch {
    return null;
  }
}

export const setWorkerProfile = (worker: Worker): void => {
  write(WORKER_PROFILE_KEY, JSON.stringify(worker));
};

export function clearWorkerProfile(): void {
  remove(WORKER_PROFILE_KEY);
}

export function clearSession(): void {
  remove(TOKEN_KEY);
  remove(SESSION_KEY);
  remove(WORKER_PROFILE_KEY);
}
