import { getToken } from '../utils/storage';
import i18n from '../i18n';

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
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: Record<string, string>;
  query?: Record<string, string | undefined>;
  auth?: boolean;
}

function statusMessage(status: number, serverText: string): string {
  let detailText = serverText;
  try {
    const payload: unknown = JSON.parse(serverText);
    if (typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string') {
      detailText = payload.message;
    }
  } catch {
    // Keep the plain-text response when it is not JSON.
  }
  const detail = detailText && detailText.length < 200 ? ` (${detailText})` : '';
  switch (status) {
    case 400: return `${i18n.t('apiErrors.badRequest')}${detail}`;
    case 401: return `${i18n.t('apiErrors.unauthorized')}${detail}`;
    case 403: return `${i18n.t('apiErrors.forbidden')}${detail}`;
    case 404: return `${i18n.t('apiErrors.notFound')}${detail}`;
    case 409: return `${i18n.t('apiErrors.conflict')}${detail}`;
    default:
      return status >= 500
        ? i18n.t('apiErrors.serverError')
        : `${i18n.t('apiErrors.generic')} (status ${status})${detail}`;
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
      i18n.t('apiErrors.connectionFailed'),
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
  return e instanceof Error ? e.message : i18n.t('apiErrors.generic');
}

/** Some endpoints may return a single object, an array, or nothing. */
export const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
