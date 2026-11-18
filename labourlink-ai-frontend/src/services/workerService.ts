import { asArray, request, USE_MOCK } from './api';
import { MOCK_WORKERS } from './mockData';
import type { Worker, WorkerInput } from '../types/Worker';

export const updateMyMatchingProfile = (data: Pick<Worker, 'category' | 'state' | 'district' | 'expectedWagePerDay'>) =>
  request<Worker>('/workers/me/matching-profile', { auth: true, method: 'PUT', body: data });

export async function registerWorker(
  data: WorkerInput
): Promise<Worker | string> {
  return request<Worker | string>(
    '/workers/register',
    {
      method: 'POST',
      body: data,
    }
  );
}

export async function getMyWorker(): Promise<Worker> {
  return request<Worker>(
    '/workers/me',
    {
      auth: true,
    }
  );
}

export async function getWorkers(): Promise<Worker[]> {
  if (USE_MOCK) {
    return MOCK_WORKERS;
  }

  return asArray<Worker>(
    await request<unknown>(
      '/workers',
      {
        auth: true,
      }
    )
  );
}

export async function searchWorkers(
  skill?: string,
  location?: string,
  latitude?: number,
  longitude?: number,
  radiusKm?: number
): Promise<Worker[]> {
  if (USE_MOCK) {
    return MOCK_WORKERS;
  }

  return asArray<Worker>(
    await request<unknown>(
      '/workers/search',
      {
        query: {
          ...(skill ? { skill } : {}),
          ...(location ? { location } : {}),
          ...(latitude !== undefined ? { latitude: String(latitude) } : {}),
          ...(longitude !== undefined ? { longitude: String(longitude) } : {}),
          ...(radiusKm !== undefined ? { radiusKm: String(radiusKm) } : {}),
        },
      auth: true,
      }
    )
  );
}

export async function updateMyWorkerLocation(data: { location: string; shareLocation: boolean; latitude?: number; longitude?: number }): Promise<Worker> {
  return request<Worker>('/workers/me/location', { method: 'PATCH', body: data, auth: true });
}
