import { asArray, request, USE_MOCK } from './api';
import { MOCK_WORKERS } from './mockData';
import type { Worker, WorkerInput } from '../types/Worker';

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