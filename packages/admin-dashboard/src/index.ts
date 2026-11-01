import './config/env.js';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { database } from '@instantpay/config';
import { loggerPlugin } from '@instantpay/utils';

import { env } from './config/env.js';
import { buildContainer } from './container.js';
import { monitoringRoutes } from './modules/monitoring/infrastructure/http/routes/monitoring.routes.js';
import { incidentRoutes } from './modules/incidents/infrastructure/http/routes/incident.routes.js';
import { featureFlagRoutes } from './modules/feature-flags/infrastructure/http/routes/feature-flag.routes.js';
import { overviewRoutes } from './modules/overview/infrastructure/http/routes/overview.routes.js';

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
  serviceName: 'admin-dashboard',
  logsDir: './logs',
  logRequests: true,
  logResponses: true,
  excludePaths: ['/ping', '/health', '/health/database'],
});

const container = buildContainer(database);

// ── Health ───────────────────────────────────────────────────────────────────
server.get('/ping', async () => ({
  status: 'ok',
  service: 'admin-dashboard',
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
await server.register(monitoringRoutes, {
  prefix: API_PREFIX,
  service: container.monitoringService,
});

await server.register(incidentRoutes, {
  prefix: API_PREFIX,
  service: container.incidentService,
});

await server.register(featureFlagRoutes, {
  prefix: API_PREFIX,
  service: container.featureFlagService,
});

await server.register(overviewRoutes, {
  prefix: API_PREFIX,
  service: container.overviewService,
});

// ── Frontend (build do Vite) ─────────────────────────────────────────────────
// Em produção, `npm run build` gera `web/dist` e o mesmo processo serve a SPA.
// Em desenvolvimento, usa `npm run web:dev` (porta 5174, com proxy para /api).
const webRoot = fileURLToPath(new URL('../web/dist', import.meta.url));

if (existsSync(webRoot)) {
  await server.register(fastifyStatic, {
    root: webRoot,
    prefix: '/',
  });

  server.setNotFoundHandler((request, reply) => {
    const url = request.raw.url ?? '';
    const isApiRoute =
      url.startsWith('/api/') ||
      url === '/ping' ||
      url === '/health' ||
      url.startsWith('/health/');

    if (isApiRoute) {
      void reply.code(404).send({
        status: 'error',
        error: {
          type: 'NOT_FOUND',
          message: 'Rota não encontrada',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    void reply.sendFile('index.html');
  });
}

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
    server.logger.info(`Admin dashboard a escutar em ${address}`, {
      environment: env.NODE_ENV,
      defaultHealthTimeoutMs: env.ADMIN_DEFAULT_HEALTH_TIMEOUT_MS,
    });
  } catch (error) {
    server.logger.error('Falha ao iniciar o admin-dashboard', error);
    process.exit(1);
  }
};

void start();
