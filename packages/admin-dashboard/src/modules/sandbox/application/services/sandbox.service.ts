import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type { IServiceRepository } from '../../../monitoring/application/ports/monitoring.port.js';
import type {
  SandboxAccountDTO,
  SandboxDemoDTO,
  SandboxGatewayRequestDTO,
  SandboxGatewayResponseDTO,
  SandboxMethod,
  SandboxRequestDTO,
  SandboxResponseDTO,
  SandboxService,
  SandboxSmokeResultDTO,
  SandboxSmokeStepDTO,
} from '../dtos/sandbox.dto.js';
import type { ISandboxService } from '../ports/sandbox.port.js';

const COMPONENT = 'SandboxService';

type ServiceName = SandboxService | 'gateway-api';

type SandboxServiceOptions = {
  services: IServiceRepository;
  gatewayAdminToken?: string;
  timeoutMs: number;
};

type RawResponse = {
  statusCode: number;
  durationMs: number;
  body: unknown;
};

type DownstreamConfig = {
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

type HealthResponse = {
  status: 'healthy' | 'unhealthy';
  database: 'connected' | 'disconnected';
};

type AuthResponse = {
  user: {
    id: string;
    username: string;
    email: string;
    fullName: string;
  };
  accessToken: string;
  refreshToken: string;
};

type BankResponse = {
  id: string;
  bankName: string;
  bankCode: string;
};

type AccountResponse = {
  id: string;
  accountNumber: string;
  balance: number | string;
  availableBalance: number | string;
  currencyCode: string;
  accountType: string;
  status: string;
};

type AccountsListResponse = {
  data: AccountResponse[];
};

type TransferResponse = {
  id: string;
  status: string;
  reference: string;
};

type FraudAssessmentResponse = {
  id: string;
  score: number;
  riskLevel: string;
  decision: string;
  matchedRules: unknown[];
};

type PaymentResponse = {
  id: string;
  status: string;
  reference: string;
};

type NotificationResponse = {
  id: string;
  status: string;
  provider: string | null;
  channel: string;
};

type ReconciliationRunResponse = {
  statement: {
    id: string;
    status: string;
  };
  matches: number;
  discrepancies: number;
};

type CreatedApiKeyResponse = {
  apiKey: {
    id: string;
    keyPrefix: string;
  };
  key: string;
};

class DownstreamError extends Error {
  constructor(
    readonly service: ServiceName,
    readonly method: SandboxMethod,
    readonly path: string,
    readonly statusCode: number,
    readonly body: unknown
  ) {
    super(`${service} respondeu HTTP ${statusCode} em ${method} ${path}`);
    this.name = 'DownstreamError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const errorFromBody = (body: unknown): string | null => {
  if (isRecord(body) && isRecord(body.error)) {
    const message = body.error.message;
    if (typeof message === 'string' && message.trim()) {
      const errors = body.error.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        const first = errors[0];
        if (isRecord(first) && typeof first.message === 'string') {
          return `${message}: ${first.message}`;
        }
      }
      return message;
    }
  }
  if (typeof body === 'string' && body.trim()) {
    return body.trim().slice(0, 300);
  }
  return null;
};

const toNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toAccount = (value: unknown): SandboxAccountDTO | null => {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string') return null;

  return {
    id: value.id,
    accountNumber:
      typeof value.accountNumber === 'string'
        ? value.accountNumber
        : String(value.accountNumber ?? ''),
    balance: toNumber(value.balance),
    availableBalance: toNumber(value.availableBalance),
    currencyCode:
      typeof value.currencyCode === 'string' ? value.currencyCode : 'AOA',
    accountType:
      typeof value.accountType === 'string' ? value.accountType : 'CORRENTE',
    status: typeof value.status === 'string' ? value.status : 'active',
  };
};

const describeError = (error: unknown): string => {
  if (error instanceof DownstreamError) {
    const detail = errorFromBody(error.body);
    return `${error.service} HTTP ${error.statusCode}${detail ? `: ${detail}` : ''}`;
  }
  if (error instanceof Error) return error.message;
  return 'Erro inesperado';
};

const toAppError = (error: unknown): AppError => {
  if (error instanceof DownstreamError) {
    const detail = errorFromBody(error.body);
    return ErrorFactory.business(
      `${error.service} respondeu HTTP ${error.statusCode}${detail ? `: ${detail}` : ''}`,
      'sandbox_downstream_error',
      COMPONENT
    );
  }

  return ErrorFactory.externalService(
    error instanceof Error ? error.message : 'Falha inesperada no laboratório',
    'sandbox',
    error,
    COMPONENT
  );
};

export const createSandboxService = ({
  services,
  gatewayAdminToken,
  timeoutMs,
}: SandboxServiceOptions): ISandboxService => {
  const resolveService = async (
    name: ServiceName
  ): Promise<{
    id: string;
    name: string;
    baseUrl: string;
    active: boolean;
    timeoutMs: number;
  }> => {
    const service = await services.findByName(name);
    if (!service) {
      throw new Error(`O serviço ${name} não está registado no admin`);
    }
    return {
      id: service.id,
      name: service.name,
      baseUrl: service.baseUrl,
      active: service.isActive,
      timeoutMs: service.timeoutMs,
    };
  };

  const fetchService = async (
    serviceName: ServiceName,
    method: SandboxMethod,
    path: string,
    options: DownstreamConfig = {}
  ): Promise<RawResponse> => {
    const service = await resolveService(serviceName);
    if (!service.active) {
      throw new Error(`O serviço ${serviceName} está inactivo no admin`);
    }

    const base = service.baseUrl.endsWith('/')
      ? service.baseUrl
      : `${service.baseUrl}/`;
    const url = new URL(path.startsWith('/') ? path.slice(1) : path, base);
    const headers: Record<string, string> = {
      accept: 'application/json',
      ...options.headers,
    };
    const serializedBody =
      options.body === undefined
        ? undefined
        : typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body);

    if (serializedBody !== undefined && !headers['content-type']) {
      headers['content-type'] = 'application/json';
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.max(timeoutMs, options.timeoutMs ?? 0, service.timeoutMs ?? 0)
    );

    try {
      const response = await fetch(url, {
        method,
        headers,
        ...(serializedBody !== undefined && { body: serializedBody }),
        signal: controller.signal,
      });

      const text = await response.text();
      let body: unknown = null;

      if (text.trim()) {
        try {
          body = JSON.parse(text) as unknown;
        } catch {
          body = text;
        }
      }

      return {
        statusCode: response.status,
        durationMs: Date.now() - startedAt,
        body,
      };
    } finally {
      clearTimeout(timer);
    }
  };

  const unwrap = <T>(body: unknown): T => {
    if (isRecord(body) && body.status === 'success' && 'data' in body) {
      return body.data as T;
    }
    return body as T;
  };

  const call = async <T>(
    serviceName: ServiceName,
    method: SandboxMethod,
    path: string,
    options: DownstreamConfig = {}
  ): Promise<{ response: RawResponse; data: T }> => {
    const response = await fetchService(serviceName, method, path, options);

    if (response.statusCode >= 400) {
      throw new DownstreamError(
        serviceName,
        method,
        path,
        response.statusCode,
        response.body
      );
    }

    return { response, data: unwrap<T>(response.body) };
  };

  const fetchAccounts = async (
    userId: string,
    token: string
  ): Promise<SandboxAccountDTO[]> => {
    const { data } = await call<AccountsListResponse>(
      'core-banking',
      'GET',
      `/api/v1/accounts?userId=${encodeURIComponent(userId)}&pageSize=100`,
      { headers: { authorization: `Bearer ${token}` } }
    );

    const rows = Array.isArray(data?.data) ? data.data : [];
    return rows
      .map(toAccount)
      .filter((account): account is SandboxAccountDTO => account !== null)
      .sort((left, right) =>
        left.accountNumber.localeCompare(right.accountNumber)
      );
  };

  const createDemoOrThrow = async (): Promise<SandboxDemoDTO> => {
    const suffix = `${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    const phone = `+2449${Date.now().toString().slice(-6)}${Math.floor(
      Math.random() * 10_000
    )
      .toString()
      .padStart(4, '0')}`;
    const email = `demo.${suffix}@instantpay.local`;
    const password = 'Demo!Pass123';
    const createdAt = new Date().toISOString();

    await call<AuthResponse>('core-banking', 'POST', '/api/v1/auth/register', {
      body: {
        username: `demo_${suffix}`,
        email,
        phone,
        password,
        biNumber: `BI-${suffix}`,
        nif: `NIF-${suffix}`,
        fullName: `Demo InstantPay ${suffix}`,
        dateOfBirth: '1990-01-01',
      },
    });

    const { data: auth } = await call<AuthResponse>(
      'core-banking',
      'POST',
      '/api/v1/auth/login',
      { body: { email, password } }
    );

    const token = auth.accessToken;
    const authorization = { authorization: `Bearer ${token}` };

    const { data: bank } = await call<BankResponse>(
      'core-banking',
      'POST',
      '/api/v1/banks',
      {
        headers: authorization,
        body: {
          bankName: `Banco Demo ${suffix}`,
          bankCode: `D${suffix.slice(-8).toUpperCase()}`,
          swiftCode: `D${suffix.slice(-8).toUpperCase()}`,
          status: true,
          reservePercentage: 0.1,
        },
      }
    );

    const { data: firstAccount } = await call<AccountResponse>(
      'core-banking',
      'POST',
      '/api/v1/accounts',
      {
        headers: authorization,
        body: {
          userId: auth.user.id,
          bankId: bank.id,
          accountType: 'CORRENTE',
          currencyCode: 'AOA',
        },
      }
    );

    const { data: secondAccount } = await call<AccountResponse>(
      'core-banking',
      'POST',
      '/api/v1/accounts',
      {
        headers: authorization,
        body: {
          userId: auth.user.id,
          bankId: bank.id,
          accountType: 'POUPANCA',
          currencyCode: 'AOA',
        },
      }
    );

    await call<TransferResponse>(
      'core-banking',
      'POST',
      '/api/v1/transactions/deposit',
      {
        headers: authorization,
        body: {
          toAccountId: firstAccount.id,
          amount: 500_000,
          description: 'Saldo inicial do laboratório',
        },
      }
    );

    await call<TransferResponse>(
      'core-banking',
      'POST',
      '/api/v1/transactions/deposit',
      {
        headers: authorization,
        body: {
          toAccountId: secondAccount.id,
          amount: 100_000,
          description: 'Saldo inicial do laboratório',
        },
      }
    );

    const accounts = await fetchAccounts(auth.user.id, token);
    if (accounts.length < 2) {
      throw new Error('Não foi possível carregar as duas contas de teste');
    }

    return {
      createdAt,
      accessToken: token,
      refreshToken: auth.refreshToken ?? null,
      user: {
        id: auth.user.id,
        username: auth.user.username,
        email: auth.user.email,
        fullName: auth.user.fullName,
      },
      bank: {
        id: bank.id,
        bankName: bank.bankName,
        bankCode: bank.bankCode,
      },
      accounts,
    };
  };

  const runHealthChecks = async (): Promise<{
    summary: string;
    details: unknown;
  }> => {
    const names: ServiceName[] = [
      'core-banking',
      'payment-processor',
      'fraud-detection',
      'notification-service',
      'reconciliation',
      'gateway-api',
    ];

    const results = await Promise.all(
      names.map(async (name) => {
        const response = await fetchService(name, 'GET', '/health', {
          timeoutMs: 5_000,
        });
        const health = isRecord(response.body)
          ? (response.body as HealthResponse)
          : null;
        return {
          service: name,
          statusCode: response.statusCode,
          status: health?.status ?? null,
          database: health?.database ?? null,
        };
      })
    );

    const failed = results.filter((result) => result.statusCode !== 200);
    if (failed.length > 0) {
      throw new Error(
        `Serviços com falha: ${failed.map((item) => item.service).join(', ')}`
      );
    }

    return {
      summary: `${results.length}/${results.length} serviços saudáveis`,
      details: results,
    };
  };

  const runTransferStep = async (
    demo: SandboxDemoDTO
  ): Promise<{ summary: string; details: unknown }> => {
    const [source, destination] = demo.accounts;
    if (!source || !destination) {
      throw new Error('O ambiente não tem duas contas disponíveis');
    }

    const { data } = await call<TransferResponse>(
      'core-banking',
      'POST',
      '/api/v1/transactions/transfer',
      {
        headers: { authorization: `Bearer ${demo.accessToken}` },
        body: {
          fromAccountId: source.id,
          toAccountId: destination.id,
          amount: 1_250,
          description: 'Transferência do teste completo',
        },
      }
    );

    const accounts = await fetchAccounts(demo.user.id, demo.accessToken);
    if (accounts.length >= 2) {
      demo.accounts = accounts;
    }

    return {
      summary: `Transferência ${data.status} · ${data.reference}`,
      details: {
        id: data.id,
        status: data.status,
        reference: data.reference,
        amount: 1_250,
        from: source.accountNumber,
        to: destination.accountNumber,
        balances: accounts.map((account) => ({
          account: account.accountNumber,
          balance: account.balance,
        })),
      },
    };
  };

  const runFraudStep = async (
    demo: SandboxDemoDTO
  ): Promise<{ summary: string; details: unknown }> => {
    const { data } = await call<FraudAssessmentResponse>(
      'fraud-detection',
      'POST',
      '/api/v1/fraud/assessments',
      {
        body: {
          subjectType: 'PAYMENT',
          subjectId: `LAB-${Date.now()}`,
          userId: demo.user.id,
          amount: 150_000,
          currencyCode: 'AOA',
          method: 'CARD',
          channel: 'web',
          country: 'AO',
          email: demo.user.email,
          isNewDevice: true,
          isForeignIp: true,
          transactionsLastHour: 12,
          transactionsLastDay: 20,
        },
      }
    );

    return {
      summary: `Score ${data.score} · ${data.decision} · ${data.matchedRules.length} regra(s)`,
      details: {
        id: data.id,
        score: data.score,
        riskLevel: data.riskLevel,
        decision: data.decision,
        matchedRules: data.matchedRules,
      },
    };
  };

  const runPaymentStep = async (
    demo: SandboxDemoDTO
  ): Promise<{ summary: string; details: unknown }> => {
    const { data } = await call<PaymentResponse>(
      'payment-processor',
      'POST',
      '/api/v1/payments',
      {
        body: {
          amount: 2_500,
          currencyCode: 'AOA',
          method: 'CARD',
          customerEmail: demo.user.email,
          description: 'Pagamento do teste completo',
        },
      }
    );

    return {
      summary: `${data.status} · ${data.reference}`,
      details: {
        id: data.id,
        status: data.status,
        reference: data.reference,
        amount: 2_500,
      },
    };
  };

  const runNotificationStep = async (
    demo: SandboxDemoDTO
  ): Promise<{ summary: string; details: unknown }> => {
    const { data } = await call<NotificationResponse>(
      'notification-service',
      'POST',
      '/api/v1/notifications',
      {
        body: {
          channel: 'email',
          recipient: demo.user.email,
          subject: 'Teste completo InstantPay',
          body: 'Notificação enviada pelo laboratório do admin.',
        },
      }
    );

    return {
      summary: `${data.channel} · ${data.status} · ${data.provider ?? 'sem provider'}`,
      details: {
        id: data.id,
        channel: data.channel,
        status: data.status,
        provider: data.provider,
      },
    };
  };

  const runReconciliationScenario = async (input: {
    amount: number;
    currencyCode: string;
    accountReference: string;
    simulateMismatch: boolean;
  }): Promise<{
    summary: string;
    details: unknown;
  }> => {
    const reference = `LAB-${Date.now().toString(36)}`;
    const now = new Date();
    const periodStart = new Date(now.getTime() - 60 * 60 * 1000);
    const periodEnd = new Date(now.getTime() + 60 * 60 * 1000);
    const entryAmount = input.simulateMismatch
      ? input.amount + 1
      : input.amount;

    await call(
      'reconciliation',
      'POST',
      '/api/v1/reconciliation/internal-records',
      {
        body: {
          source: 'manual',
          sourceReference: reference,
          accountReference: input.accountReference,
          direction: 'credit',
          amount: input.amount,
          currencyCode: input.currencyCode,
          valueDate: now.toISOString(),
          description: 'Registo interno do laboratório',
        },
      }
    );

    const { data: statement } = await call<{ id: string }>(
      'reconciliation',
      'POST',
      '/api/v1/reconciliation/statements',
      {
        body: {
          reference: `ST-${reference}`,
          source: 'manual',
          accountReference: input.accountReference,
          currencyCode: input.currencyCode,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          openingBalance: 0,
          closingBalance: entryAmount,
          metadata: { origin: 'admin-lab' },
        },
      }
    );

    await call(
      'reconciliation',
      'POST',
      `/api/v1/reconciliation/statements/${statement.id}/entries`,
      {
        body: {
          entries: [
            {
              externalReference: reference,
              direction: 'credit',
              amount: entryAmount,
              currencyCode: input.currencyCode,
              valueDate: now.toISOString(),
              description: 'Linha do extracto do laboratório',
            },
          ],
        },
      }
    );

    const { data: run } = await call<ReconciliationRunResponse>(
      'reconciliation',
      'POST',
      `/api/v1/reconciliation/statements/${statement.id}/run`
    );

    return {
      summary: `${run.matches} match(es) · ${run.discrepancies} discrepância(s)`,
      details: {
        statementId: statement.id,
        reference,
        status: run.statement.status,
        matches: run.matches,
        discrepancies: run.discrepancies,
        simulateMismatch: input.simulateMismatch,
      },
    };
  };

  const runReconciliationStep = async (
    demo: SandboxDemoDTO
  ): Promise<{ summary: string; details: unknown }> => {
    const accountReference = demo.accounts[0]?.accountNumber ?? 'LAB-ACCOUNT';
    return runReconciliationScenario({
      amount: 1_250,
      currencyCode: 'AOA',
      accountReference,
      simulateMismatch: false,
    });
  };

  const executeGatewayRequest = async (
    method: SandboxMethod,
    path: string,
    body?: unknown
  ): Promise<SandboxGatewayResponseDTO> => {
    if (!gatewayAdminToken) {
      throw new Error(
        'GATEWAY_ADMIN_TOKEN não está configurado no admin-dashboard'
      );
    }

    const adminHeaders = { 'x-admin-token': gatewayAdminToken };
    const { data: created } = await call<CreatedApiKeyResponse>(
      'gateway-api',
      'POST',
      '/api/v1/gateway/api-keys',
      {
        headers: adminHeaders,
        body: {
          name: `sandbox-${Date.now()}`,
          scopes: ['read', 'write'],
          rateLimitPerMinute: 120,
        },
      }
    );

    let response: RawResponse | null = null;
    let revoked = false;

    try {
      response = await fetchService('gateway-api', method, path, {
        body,
        headers: { 'x-api-key': created.key },
      });
    } finally {
      try {
        const revoke = await fetchService(
          'gateway-api',
          'POST',
          `/api/v1/gateway/api-keys/${created.apiKey.id}/revoke`,
          { headers: adminHeaders }
        );
        revoked = revoke.statusCode < 400;
      } catch {
        revoked = false;
      }
    }

    if (!response) {
      throw new Error('O gateway não devolveu uma resposta');
    }

    return {
      method,
      path,
      statusCode: response.statusCode,
      durationMs: response.durationMs,
      apiKeyPrefix: created.apiKey.keyPrefix,
      revoked,
      body: response.body,
    };
  };

  const runGatewayStep = async (
    _demo: SandboxDemoDTO
  ): Promise<{
    summary: string;
    details: unknown;
  }> => {
    const result = await executeGatewayRequest(
      'GET',
      '/api/v1/fraud/rules?pageSize=5'
    );

    if (result.statusCode >= 400) {
      throw new DownstreamError(
        'gateway-api',
        'GET',
        '/api/v1/fraud/rules?pageSize=5',
        result.statusCode,
        result.body
      );
    }

    return {
      summary: `HTTP ${result.statusCode} via gateway · ${result.durationMs} ms`,
      details: {
        path: result.path,
        statusCode: result.statusCode,
        durationMs: result.durationMs,
        apiKeyPrefix: result.apiKeyPrefix,
        revoked: result.revoked,
      },
    };
  };

  return {
    async createDemo(): Promise<Result<SandboxDemoDTO, AppError>> {
      try {
        return Ok(await createDemoOrThrow());
      } catch (error) {
        return Err(toAppError(error));
      }
    },

    async request(
      data: SandboxRequestDTO
    ): Promise<Result<SandboxResponseDTO, AppError>> {
      try {
        const response = await fetchService(
          data.service,
          data.method,
          data.path,
          {
            body: data.body,
            ...(data.headers?.authorization && {
              headers: { authorization: data.headers.authorization },
            }),
          }
        );

        return Ok({
          service: data.service,
          method: data.method,
          path: data.path,
          statusCode: response.statusCode,
          durationMs: response.durationMs,
          body: response.body,
        });
      } catch (error) {
        return Err(toAppError(error));
      }
    },

    async gateway(
      data: SandboxGatewayRequestDTO
    ): Promise<Result<SandboxGatewayResponseDTO, AppError>> {
      try {
        return Ok(
          await executeGatewayRequest(data.method, data.path, data.body)
        );
      } catch (error) {
        return Err(toAppError(error));
      }
    },

    async smoke(): Promise<Result<SandboxSmokeResultDTO, AppError>> {
      const startedAt = new Date();
      const steps: SandboxSmokeStepDTO[] = [];
      let demo: SandboxDemoDTO | null = null;

      const runStep = async (
        key: string,
        label: string,
        fn: () => Promise<{ summary: string; details?: unknown }>
      ): Promise<void> => {
        const stepStartedAt = Date.now();
        try {
          const result = await fn();
          steps.push({
            key,
            label,
            status: 'passed',
            durationMs: Date.now() - stepStartedAt,
            summary: result.summary,
            details: result.details,
          });
        } catch (error) {
          steps.push({
            key,
            label,
            status: 'failed',
            durationMs: Date.now() - stepStartedAt,
            summary: describeError(error),
          });
        }
      };

      await runStep('health', 'Serviços · health', runHealthChecks);

      const bootstrapStartedAt = Date.now();
      try {
        demo = await createDemoOrThrow();
        steps.push({
          key: 'bootstrap',
          label: 'Core banking · ambiente de teste',
          status: 'passed',
          durationMs: Date.now() - bootstrapStartedAt,
          summary: `Conta ${demo.user.email} com ${demo.accounts.length} contas`,
          details: {
            user: demo.user,
            bank: demo.bank,
            accounts: demo.accounts,
          },
        });
      } catch (error) {
        steps.push({
          key: 'bootstrap',
          label: 'Core banking · ambiente de teste',
          status: 'failed',
          durationMs: Date.now() - bootstrapStartedAt,
          summary: describeError(error),
        });
      }

      const rest = [
        {
          key: 'core-banking',
          label: 'Core banking · transferência',
          fn: runTransferStep,
        },
        {
          key: 'fraud-detection',
          label: 'Fraud detection · avaliação',
          fn: runFraudStep,
        },
        {
          key: 'payment-processor',
          label: 'Payment processor · pagamento',
          fn: runPaymentStep,
        },
        {
          key: 'notification-service',
          label: 'Notification service · envio',
          fn: runNotificationStep,
        },
        {
          key: 'reconciliation',
          label: 'Reconciliation · extracto',
          fn: runReconciliationStep,
        },
        {
          key: 'gateway-api',
          label: 'Gateway API · proxy autenticado',
          fn: runGatewayStep,
        },
      ];

      if (!demo) {
        for (const step of rest) {
          steps.push({
            key: step.key,
            label: step.label,
            status: 'skipped',
            durationMs: 0,
            summary: 'Não executado porque o ambiente de teste falhou',
          });
        }
      } else {
        const currentDemo = demo;
        for (const step of rest) {
          await runStep(step.key, step.label, () => step.fn(currentDemo));
        }

        try {
          const accounts = await fetchAccounts(
            currentDemo.user.id,
            currentDemo.accessToken
          );
          if (accounts.length >= 2) {
            currentDemo.accounts = accounts;
          }
        } catch {
          // A actualização de saldos é apenas informativa.
        }
      }

      const finishedAt = new Date();
      return Ok({
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        demo,
        steps,
      });
    },
  };
};
