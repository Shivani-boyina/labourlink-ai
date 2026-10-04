import { getToken } from '../utils/storage';

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
export const USE_MOCK: boolean = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  form?: Record<string, string>;
  query?: Record<string, string | undefined>;
  auth?: boolean;
}

function statusMessage(status: number, serverText: string): string {
  const detail = serverText && serverText.length < 200 ? ` (${serverText})` : '';
  switch (status) {
    case 400: return `The server rejected the data. Please check the form.${detail}`;
    case 401: return `Wrong phone number or password, or your login has expired.${detail}`;
    case 403: return `Access denied. You may need to log in to access this resource.${detail}`;
    case 404: return 'Not found. The item may have been removed.';
    case 409: return `This record already exists.${detail}`;
    default:
      return status >= 500
        ? 'Server error. Please try again, or check the backend console for details.'
        : `Request failed (status ${status}).${detail}`;
  }
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(path, API_BASE_URL);
  if (opts.query) {
    Object.entries(opts.query).forEach(([k, v]) => {
      if (v !== undefined && v.trim() !== '') url.searchParams.set(k, v.trim());
    });
  }
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  } else if (opts.form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(opts.form).toString();
  }
  if (opts.auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), { method: opts.method ?? 'GET', headers, body });
  } catch {
    throw new ApiError(
      `Backend connection failed. Please make sure LabourLink AI backend is running at ${API_BASE_URL}.`,
      0,
    );
  }

  const text = await res.text();
  if (!res.ok) throw new ApiError(statusMessage(res.status, text), res.status);
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong. Please try again.';
}

/** Some endpoints may return a single object, an array, or nothing. */
export const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
