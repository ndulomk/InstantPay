export type SandboxService =
  | 'core-banking'
  | 'payment-processor'
  | 'fraud-detection'
  | 'notification-service'
  | 'reconciliation';

export type SandboxMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type SandboxResponse = {
  service: SandboxService;
  method: SandboxMethod;
  path: string;
  statusCode: number;
  durationMs: number;
  body: unknown;
};

export type DemoAccount = {
  id: string;
  accountNumber: string;
  balance: number;
  availableBalance: number;
  currencyCode: string;
  accountType: string;
  status: string;
};

export type SandboxDemo = {
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
  accounts: DemoAccount[];
};

export type SandboxGatewayResult = {
  method: SandboxMethod;
  path: string;
  statusCode: number;
  durationMs: number;
  apiKeyPrefix: string;
  revoked: boolean;
  body: unknown;
};

export type SmokeStepStatus = 'passed' | 'failed' | 'skipped';

export type SmokeStep = {
  key: string;
  label: string;
  status: SmokeStepStatus;
  durationMs: number;
  summary: string;
  details?: unknown;
};

export type SmokeResult = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  demo: SandboxDemo | null;
  steps: SmokeStep[];
};

export type ActivityStatus = 'success' | 'error' | 'info';

export type LabActivity = {
  id: string;
  at: string;
  label: string;
  status: ActivityStatus;
  summary: string;
  details?: unknown;
};

export type LabActionResult = {
  status: 'success' | 'error';
  summary: string;
  details?: unknown;
};
