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

export async function getMyContractor(): Promise<Contractor> {
  const response = await request<ApiResponse<Contractor>>('/contractors/me', { auth: true });
  return response.data;
}

export async function updateMyContractorRegion(data: Pick<Contractor, 'state' | 'district'>): Promise<Contractor> {
  const response = await request<ApiResponse<Contractor>>('/contractors/me/region', { auth: true, method: 'PUT', body: data });
  return response.data;
}

export async function searchContractors(location: string): Promise<Contractor[]> {
  if (!location.trim()) return getContractors();
  const response = await request<ApiResponse<Contractor[]>>('/contractors/search', {
    query: { location },
    auth: true,
  });
  return Array.isArray(response.data) ? response.data : [];
}
