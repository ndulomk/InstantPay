import { z } from 'zod';

export const SANDBOX_SERVICES = [
  'core-banking',
  'payment-processor',
  'fraud-detection',
  'notification-service',
  'reconciliation',
] as const;
export type SandboxService = (typeof SANDBOX_SERVICES)[number];

export const SANDBOX_METHODS = ['GET', 'POST', 'PATCH', 'DELETE'] as const;
export type SandboxMethod = (typeof SANDBOX_METHODS)[number];

export type SandboxRequestDTO = {
  service: SandboxService;
  method: SandboxMethod;
  path: string;
  headers?: {
    authorization?: string;
  };
  body?: unknown;
};

export type SandboxResponseDTO = {
  service: SandboxService;
  method: SandboxMethod;
  path: string;
  statusCode: number;
  durationMs: number;
  body: unknown;
};

export type SandboxAccountDTO = {
  id: string;
  accountNumber: string;
  balance: number;
  availableBalance: number;
  currencyCode: string;
  accountType: string;
  status: string;
};

export type SandboxDemoDTO = {
  createdAt: string;
  accessToken: string;
  refreshToken: string | null;
  user: {
    id: string;
    username: string;
    email: string;
    fullName: string;
  };
  bank: {
    id: string;
    bankName: string;
    bankCode: string;
  };
  accounts: SandboxAccountDTO[];
};

export type SandboxGatewayRequestDTO = {
  method: SandboxMethod;
  path: string;
  body?: unknown;
};

export type SandboxGatewayResponseDTO = {
  method: SandboxMethod;
  path: string;
  statusCode: number;
  durationMs: number;
  apiKeyPrefix: string;
  revoked: boolean;
  body: unknown;
};

export const SMOKE_STEP_STATUSES = ['passed', 'failed', 'skipped'] as const;
export type SmokeStepStatus = (typeof SMOKE_STEP_STATUSES)[number];

export type SandboxSmokeStepDTO = {
  key: string;
  label: string;
  status: SmokeStepStatus;
  durationMs: number;
  summary: string;
  details?: unknown;
};

export type SandboxSmokeResultDTO = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  demo: SandboxDemoDTO | null;
  steps: SandboxSmokeStepDTO[];
};

const SANDBOX_PATH_PREFIXES: Record<SandboxService, string[]> = {
  'core-banking': ['/api/v1'],
  'payment-processor': ['/api/v1/payments'],
  'fraud-detection': ['/api/v1/fraud'],
  'notification-service': ['/api/v1/notifications'],
  reconciliation: ['/api/v1/reconciliation'],
};

const GATEWAY_PATH_PREFIXES = [
  '/api/v1/payments',
  '/api/v1/fraud',
  '/api/v1/notifications',
  '/api/v1/reconciliation',
  '/api/v1/accounts',
  '/api/v1/transactions',
  '/api/v1/banks',
  '/api/v1/users',
  '/api/v1/auth',
];

const hasAllowedPrefix = (path: string, prefixes: string[]): boolean =>
  prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

const safePath = (path: string): string => path.split('?')[0] ?? path;

const pathSchema = z
  .string()
  .trim()
  .min(1)
  .max(2_000)
  .regex(/^\/(?!\/)/, 'O caminho deve começar por / e não pode ser //');

export const sandboxRequestSchema = z
  .object({
    service: z.enum(SANDBOX_SERVICES),
    method: z.enum(SANDBOX_METHODS).default('GET'),
    path: pathSchema,
    headers: z
      .object({
        authorization: z.string().trim().min(1).max(4_096).optional(),
      })
      .strict()
      .optional(),
    body: z.unknown().optional(),
  })
  .superRefine((value, ctx) => {
    const pathname = safePath(value.path);

    if (pathname.includes('..') || pathname.includes('\\')) {
      ctx.addIssue({
        code: 'custom',
        path: ['path'],
        message: 'O caminho contém segmentos não permitidos',
      });
      return;
    }

    if (!hasAllowedPrefix(pathname, SANDBOX_PATH_PREFIXES[value.service])) {
      ctx.addIssue({
        code: 'custom',
        path: ['path'],
        message: `Este serviço só aceita caminhos em ${SANDBOX_PATH_PREFIXES[value.service].join(', ')}`,
      });
    }
  });

export const sandboxGatewayRequestSchema = z
  .object({
    method: z.enum(SANDBOX_METHODS).default('GET'),
    path: pathSchema,
    body: z.unknown().optional(),
  })
  .superRefine((value, ctx) => {
    const pathname = safePath(value.path);

    if (pathname.includes('..') || pathname.includes('\\')) {
      ctx.addIssue({
        code: 'custom',
        path: ['path'],
        message: 'O caminho contém segmentos não permitidos',
      });
      return;
    }

    if (!hasAllowedPrefix(pathname, GATEWAY_PATH_PREFIXES)) {
      ctx.addIssue({
        code: 'custom',
        path: ['path'],
        message: `O gateway só testa caminhos em ${GATEWAY_PATH_PREFIXES.join(', ')}`,
      });
    }
  });
