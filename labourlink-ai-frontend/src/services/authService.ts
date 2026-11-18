
import { request } from './api';
import {
  clearSession,
  setSession,
  setToken,
} from '../utils/storage';

import type {
  LoginRequest,
  Session,
  AuthResponse,
  UserRole,
  AuthProfileResponse,
} from '../types/Auth';

function createSession(
  response: AuthResponse,
  expectedRole: 'WORKER' | 'CONTRACTOR'
): Session {
  if (
    !response ||
    typeof response.token !== 'string' ||
    response.token.trim() === '' ||
    !Number.isSafeInteger(response.userId) ||
    response.userId <= 0 ||
    typeof response.phone !== 'string' ||
    typeof response.name !== 'string' ||
    response.role !== expectedRole
  ) {
    throw new Error('Invalid authentication response from server.');
  }

  const role: UserRole =
    response.role === 'WORKER' ? 'worker' : 'contractor';

  return {
    userId: response.userId,
    phone: response.phone,
    name: response.name,
    role,
  };
}

// Contractor login
export async function login({
  phone,
  password,
}: LoginRequest): Promise<Session> {
  const response = await request<AuthResponse>(
    '/auth/login',
    {
      method: 'POST',
      form: { phone, password },
    }
  );

  const session = createSession(response, 'CONTRACTOR');

  setToken(response.token);
  setSession(session);

  return session;
}

// Worker login
export async function workerLogin({
  phone,
  password,
}: LoginRequest): Promise<Session> {
  const response = await request<AuthResponse>(
    '/auth/worker/login',
    {
      method: 'POST',
      form: { phone, password },
    }
  );

  const session = createSession(response, 'WORKER');

  setToken(response.token);
  setSession(session);

  return session;
}

export async function getCurrentSession(): Promise<Session> {
  const response = await request<AuthProfileResponse>('/auth/me', { auth: true });
  if (
    !response ||
    !Number.isSafeInteger(response.userId) || response.userId <= 0 ||
    typeof response.phone !== 'string' || response.phone.trim() === '' ||
    typeof response.name !== 'string' ||
    (response.role !== 'WORKER' && response.role !== 'CONTRACTOR')
  ) {
    throw new Error('Invalid authentication profile response from server.');
  }

  return {
    userId: response.userId,
    phone: response.phone,
    name: response.name,
    role: response.role === 'WORKER' ? 'worker' : 'contractor',
  };
}

export const logout = (): void => {
  clearSession();
};
