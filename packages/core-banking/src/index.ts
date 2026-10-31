import './config/env.js';
import Fastify from 'fastify';
import { database } from '@instantpay/config';
import { loggerPlugin } from '@instantpay/utils';

import { buildContainer } from './container.js';
import { authRoutes } from './modules/auth/infrastructure/http/routes/auth.routes.js';
import { registerUserRoutes } from './modules/users/infrastructure/http/routes/user.routes.js';
import { registerBankRoutes } from './modules/banks/infrastructure/http/routes/bank.routes.js';
import { registerAccountRoutes } from './modules/accounts/infrastructure/http/routes/account.routes.js';
import { registerTransactionRoutes } from './modules/transactions/infrastructure/http/routes/transaction.routes.js';
import { registerLedgerRoutes } from './modules/ledger/infrastructure/http/routes/ledger.routes.js';
import { registerHoldRoutes } from './modules/holds/infrastructure/http/routes/hold.routes.js';
import { registerLimitRoutes } from './modules/limits/infrastructure/http/routes/limit.routes.js';
import { registerReserveRoutes } from './modules/reserves/infrastructure/http/routes/reserve.routes.js';
import { auditRoutes } from './modules/audit/infrastructure/http/routes/audit.routes.js';

const API_PREFIX = '/api/v1';

const server = Fastify({
  logger: false,
  disableRequestLogging: true,
  requestIdLogLabel: 'correlationId',
});

/**
 * Aceita pedidos JSON sem corpo (ex.: logout, reverse) em vez de falhar com 500.
 * O parser por omissão do Fastify rejeita um corpo vazio quando o cliente envia
 * `Content-Type: application/json`.
 */
server.removeContentTypeParser('application/json');
server.addContentTypeParser(
  'application/json',
  { parseAs: 'string' },
  (_request, body, done) => {
    if (typeof body !== 'string') {
      done(null, body);
      return;
    }
    if (body.trim().length === 0) {
      done(null, undefined);
      return;
    }
    try {
      done(null, JSON.parse(body));
    } catch {
      const error: Error & { statusCode?: number } = new Error(
        'Corpo JSON inválido'
      );
      error.statusCode = 400;
      done(error, undefined);
    }
  }
);

await server.register(loggerPlugin, {
  serviceName: 'core-banking-service',
  logsDir: './logs',
  logRequests: true,
  logResponses: true,
  excludePaths: ['/ping', '/health', '/health/database', '/metrics'],
});

server.decorateRequest('user', null);

const container = buildContainer(database);

// ── Health ───────────────────────────────────────────────────────────────────
server.get('/ping', async () => ({
  status: 'ok',
  service: 'core-banking-service',
  timestamp: new Date().toISOString(),
  database: {
    totalCount: database.pool.totalCount,
    idleCount: database.pool.idleCount,
    waitingCount: database.pool.waitingCount,
  },
}));

const databaseHealth = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  database: 'connected' | 'disconnected';
  timestamp: string;
}> => {
  try {
    await database.query('SELECT 1 AS ok');
    return {
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      status: 'unhealthy',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
};

server.get('/health', async () => databaseHealth());
server.get('/health/database', async (_request, reply) => {
  const health = await databaseHealth();
  if (health.status === 'unhealthy') reply.code(503);
  return health;
});

// ── Rotas de negócio ─────────────────────────────────────────────────────────
await server.register(authRoutes, {
  prefix: API_PREFIX,
  service: container.authService,
  guard: container.guard,
});

await server.register(registerUserRoutes, {
  prefix: API_PREFIX,
  service: container.userService,
  guard: container.guard,
});

await server.register(registerBankRoutes, {
  prefix: API_PREFIX,
  service: container.bankService,
  guard: container.guard,
});

await server.register(registerAccountRoutes, {
  prefix: API_PREFIX,
  service: container.accountService,
  guard: container.guard,
});

await server.register(registerTransactionRoutes, {
  prefix: API_PREFIX,
  service: container.transactionService,
  guard: container.guard,
});

await server.register(registerLedgerRoutes, {
  prefix: API_PREFIX,
  service: container.ledgerService,
  guard: container.guard,
});

await server.register(registerHoldRoutes, {
  prefix: API_PREFIX,
  service: container.holdService,
  guard: container.guard,
});

await server.register(registerLimitRoutes, {
  prefix: API_PREFIX,
  service: container.limitService,
  guard: container.guard,
});

await server.register(registerReserveRoutes, {
  prefix: API_PREFIX,
  service: container.reserveService,
  guard: container.guard,
});

await server.register(auditRoutes, {
  prefix: API_PREFIX,
  service: container.auditService,
  guard: container.guard,
});

// ── Shutdown ─────────────────────────────────────────────────────────────────
const shutdown = async (signal: string): Promise<void> => {
  server.logger.info(`Recebido ${signal}, a encerrar...`);
  try {
    await server.close();
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('Erro durante o shutdown', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  server.logger.error('Unhandled promise rejection', reason);
});

process.on('uncaughtException', (error) => {
  server.logger.error('Uncaught exception', error);
  process.exit(1);
});

const start = async (): Promise<void> => {
  try {
    const address = await server.listen({
      port: Number(process.env.PORT ?? 9999),
      host: process.env.HOST ?? '0.0.0.0',
    });
    server.logger.info(`Servidor a escutar em ${address}`, {
      environment: process.env.NODE_ENV ?? 'development',
    });
  } catch (error) {
    server.logger.error('Falha ao iniciar o servidor', error);
    process.exit(1);
  }
};

void start();
