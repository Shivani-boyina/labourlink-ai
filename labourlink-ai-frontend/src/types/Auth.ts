export interface Session {
  phone: string;
  contractorId: number | null;
  name: string;
}
export interface LoginRequest {
  phone: string;
  password: string;
}
