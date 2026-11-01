import type { ApiEnvelope, ApiErrorPayload } from '../types/admin';

const API_BASE_STORAGE_KEY = 'instantpay.admin.apiBase';

const DEFAULT_API_BASE =
  import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '') || '/api/v1';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isApiEnvelope = <T>(value: unknown): value is ApiEnvelope<T> =>
  isRecord(value) && value.status === 'success' && 'data' in value;

const isApiErrorPayload = (value: unknown): value is ApiErrorPayload =>
  isRecord(value) &&
  value.status === 'error' &&
  isRecord(value.error) &&
  typeof value.error.message === 'string';

export class ApiError extends Error {
  readonly status: number;
  readonly payload: ApiErrorPayload;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.error.message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }

  get code(): string | undefined {
    return this.payload.error.code;
  }

  get type(): string {
    return this.payload.error.type;
  }
}

export const getApiBase = (): string => {
  if (typeof window === 'undefined') return DEFAULT_API_BASE;

  const stored = window.localStorage.getItem(API_BASE_STORAGE_KEY)?.trim();
  return (stored || DEFAULT_API_BASE).replace(/\/+$/, '');
};

export const saveApiBase = (value: string): void => {
  const normalized = value.trim().replace(/\/+$/, '');
  if (normalized) {
    window.localStorage.setItem(API_BASE_STORAGE_KEY, normalized);
    return;
  }
  window.localStorage.removeItem(API_BASE_STORAGE_KEY);
};

export const resetApiBase = (): void => {
  window.localStorage.removeItem(API_BASE_STORAGE_KEY);
};

export const defaultApiBase = DEFAULT_API_BASE;

const parseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const base = getApiBase();
  const headers = new Headers(options.headers);
  headers.set('accept', 'application/json');
  if (options.body !== undefined && options.body !== null) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(`${base}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await parseBody(response);

  if (!response.ok) {
    const payload: ApiErrorPayload = isApiErrorPayload(body)
      ? body
      : {
          status: 'error',
          error: {
            type: 'HTTP_ERROR',
            message: `O pedido falhou com o estado HTTP ${response.status}`,
          },
        };
    throw new ApiError(response.status, payload);
  }

  if (isApiEnvelope<T>(body)) return body.data;
  return body as T;
};

type RequestBody = Record<string, unknown> | undefined;

export const api = {
  get: <T>(path: string): Promise<T> => apiRequest<T>(path),

  post: <T>(path: string, body?: RequestBody): Promise<T> =>
    apiRequest<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),

  patch: <T>(path: string, body?: RequestBody): Promise<T> =>
    apiRequest<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),

  delete: <T>(path: string): Promise<T> =>
    apiRequest<T>(path, { method: 'DELETE' }),
};

export const errorMessage = (error: unknown): string => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Ocorreu um erro inesperado';
};
