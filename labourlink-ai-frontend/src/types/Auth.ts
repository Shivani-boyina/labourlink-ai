export type UserRole = 'worker' | 'contractor';

export interface Session {
  phone: string;
  contractorId: number | null;
  name: string;
  role: UserRole;
}

export interface LoginRequest {
  phone: string;
  password: string;
}