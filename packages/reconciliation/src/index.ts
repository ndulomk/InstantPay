import './config/env.js';
import Fastify from 'fastify';
import { database } from '@instantpay/config';
import { loggerPlugin } from '@instantpay/utils';

import { env } from './config/env.js';
import { buildContainer } from './container.js';
import { statementRoutes } from './modules/statements/infrastructure/http/routes/statement.routes.js';
import { internalRecordRoutes } from './modules/internal-records/infrastructure/http/routes/internal-record.routes.js';
import { matchingRoutes } from './modules/matching/infrastructure/http/routes/matching.routes.js';
import { reportRoutes } from './modules/reports/infrastructure/http/routes/report.routes.js';

const API_PREFIX = '/api/v1';

const server = Fastify({
  logger: false,
  disableRequestLogging: true,
  requestIdLogLabel: 'correlationId',
});

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
  serviceName: 'reconciliation',
  logsDir: './logs',
  logRequests: true,
  logResponses: true,
  excludePaths: ['/ping', '/health', '/health/database'],
});

const container = buildContainer(database);

// ── Health ───────────────────────────────────────────────────────────────────
server.get('/ping', async () => ({
  status: 'ok',
  service: 'reconciliation',
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
await server.register(statementRoutes, {
  prefix: API_PREFIX,
  service: container.statementService,
});

await server.register(internalRecordRoutes, {
  prefix: API_PREFIX,
  service: container.internalRecordService,
});

await server.register(matchingRoutes, {
  prefix: API_PREFIX,
  service: container.matchingService,
});

await server.register(reportRoutes, {
  prefix: API_PREFIX,
  service: container.reportService,
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
      port: env.PORT,
      host: env.HOST,
    });
    server.logger.info(`Reconciliation a escutar em ${address}`, {
      environment: env.NODE_ENV,
      dateWindowDays: env.RECONCILIATION_DATE_WINDOW_DAYS,
    });
  } catch (error) {
    server.logger.error('Falha ao iniciar o reconciliation', error);
    process.exit(1);
  }
};

void start();
