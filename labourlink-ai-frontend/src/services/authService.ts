import { request } from './api';
import { getContractors } from './contractorService';
import {
  clearSession,
  setSession,
  setToken,
} from '../utils/storage';
import type { LoginRequest, Session } from '../types/Auth';

function extractToken(raw: unknown): string | null {
  if (typeof raw === 'string') {
    const token = raw
      .trim()
      .replace(/^"|"$/g, '')
      .replace(/^Bearer\s+/i, '');

    return token.split('.').length === 3 ? token : null;
  }

  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const value = obj.token ?? obj.jwt ?? obj.accessToken;

    return typeof value === 'string' ? value : null;
  }

  return null;
}

// Contractor login
export async function login({
  phone,
  password,
}: LoginRequest): Promise<Session> {
  const raw = await request<unknown>('/auth/login', {
    method: 'POST',
    form: {
      phone,
      password,
    },
  });

  const token = extractToken(raw);

  if (!token) {
    throw new Error('Login response did not contain a token.');
  }

  setToken(token);

  let contractorId: number | null = null;
  let name = 'Contractor';

  try {
    const list = await getContractors();

    const me = list.find(
      (contractor) => String(contractor.phone) === phone
    );

    if (me) {
      contractorId = me.contractorId;
      name = me.contractorName;
    }
  } catch {
    // Profile lookup is optional.
  }

  const session: Session = {
    phone,
    contractorId,
    name,
    role: 'contractor',
  };

  setSession(session);

  return session;
}

// Worker login
export async function workerLogin({
  phone,
  password,
}: LoginRequest): Promise<Session> {
  const raw = await request<unknown>('/auth/worker/login', {
    method: 'POST',
    form: {
      phone,
      password,
    },
  });

  const token = extractToken(raw);

  if (!token) {
    throw new Error('Invalid phone number or password.');
  }

  setToken(token);

  const session: Session = {
    phone,
    contractorId: null,
    name: 'Worker',
    role: 'worker',
  };

  setSession(session);

  return session;
}

export const logout = (): void => {
  clearSession();
};