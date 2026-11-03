import { api } from '@/lib/api-client';
import type {
  DemoAccount,
  SandboxDemo,
  SandboxGatewayResult,
  SandboxMethod,
  SandboxResponse,
  SandboxService,
  SmokeResult,
} from './types';

const DEMO_STORAGE_KEY = 'instantpay.admin.lab.demo';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const extractData = <T>(body: unknown): T | null => {
  if (isRecord(body) && body.status === 'success' && 'data' in body) {
    return body.data as T;
  }
  return body as T;
};

export const extractErrorMessage = (body: unknown): string | null => {
  if (isRecord(body) && isRecord(body.error)) {
    const message = body.error.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (typeof body === 'string' && body.trim()) return body.trim();
  return null;
};

export const downstreamError = (response: SandboxResponse): string =>
  extractErrorMessage(response.body) ??
  `${response.service} respondeu HTTP ${response.statusCode}`;

export const createSandboxDemo = (): Promise<SandboxDemo> =>
  api.post<SandboxDemo>('/admin/sandbox/demo');

export const runSandboxRequest = (input: {
  service: SandboxService;
  method: SandboxMethod;
  path: string;
  headers?: { authorization?: string };
  body?: unknown;
}): Promise<SandboxResponse> =>
  api.post<SandboxResponse>(
    '/admin/sandbox/request',
    input as Record<string, unknown>
  );

export const runSandboxGateway = (input: {
  method: SandboxMethod;
  path: string;
  body?: unknown;
}): Promise<SandboxGatewayResult> =>
  api.post<SandboxGatewayResult>(
    '/admin/sandbox/gateway',
    input as Record<string, unknown>
  );

export const runSandboxSmoke = (): Promise<SmokeResult> =>
  api.post<SmokeResult>('/admin/sandbox/smoke');

export const fetchDemoAccounts = async (
  demo: SandboxDemo
): Promise<DemoAccount[]> => {
  const response = await runSandboxRequest({
    service: 'core-banking',
    method: 'GET',
    path: `/api/v1/accounts?userId=${encodeURIComponent(demo.user.id)}&pageSize=100`,
    headers: { authorization: `Bearer ${demo.accessToken}` },
  });

  if (response.statusCode >= 400) {
    throw new Error(downstreamError(response));
  }

  const list = extractData<{ data?: DemoAccount[] }>(response.body);
  const accounts = Array.isArray(list?.data) ? list.data : [];
  return [...accounts].sort((left, right) =>
    left.accountNumber.localeCompare(right.accountNumber)
  );
};

export const loadStoredDemo = (): SandboxDemo | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      isRecord(parsed) &&
      typeof parsed.accessToken === 'string' &&
      Array.isArray(parsed.accounts) &&
      isRecord(parsed.user)
    ) {
      return parsed as SandboxDemo;
    }
    return null;
  } catch {
    return null;
  }
};

export const storeDemo = (demo: SandboxDemo | null): void => {
  if (typeof window === 'undefined') return;
  if (demo) {
    window.sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demo));
    return;
  }
  window.sessionStorage.removeItem(DEMO_STORAGE_KEY);
};

export const createActivityId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
