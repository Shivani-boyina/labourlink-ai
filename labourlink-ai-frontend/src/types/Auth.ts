
export type UserRole = 'worker' | 'contractor';

export interface Session {
  userId: number;
  phone: string;
  name: string;
  role: UserRole;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: number;
  phone: string;
  name: string;
  role: 'WORKER' | 'CONTRACTOR';
}
