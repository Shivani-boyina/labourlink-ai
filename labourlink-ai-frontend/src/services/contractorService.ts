import { request } from './api';
import type {
  Contractor,
  ContractorInput,
} from '../types/Contractor';

interface ApiResponse<T> {
  message: string;
  status: string;
  data: T;
}

export const registerContractor = (
  data: ContractorInput
) =>
  request<ApiResponse<Contractor>>(
    '/contractors/register',
    {
      method: 'POST',
      body: data,
    }
  );

export async function getContractors(): Promise<Contractor[]> {
  const response =
    await request<ApiResponse<Contractor[]>>(
      '/contractors',
      {
        auth: true,
      }
    );

  return Array.isArray(response.data)
    ? response.data
    : [];
}