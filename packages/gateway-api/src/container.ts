import type { Database } from '@instantpay/config';
import { database } from '@instantpay/config';
import type { preHandlerHookHandler } from 'fastify';

import { env } from './config/env.js';
import { buildUpstreams } from './config/upstreams.js';
import { createEventBus, type EventBus } from './shared/events/event-bus.js';
import { createAdminGuard } from './shared/auth/admin.guard.js';
import { createApiKeyGuard } from './shared/auth/api-key.guard.js';

import { createApiKeyRepository } from './modules/api-keys/infrastructure/persistence/api-key.repository.js';
import { createApiKeyService } from './modules/api-keys/application/services/api-key.service.js';
import type { IApiKeyService } from './modules/api-keys/application/ports/api-key.port.js';

import { createRateLimitRepository } from './modules/rate-limits/infrastructure/persistence/rate-limit.repository.js';
import { createRateLimitService } from './modules/rate-limits/application/services/rate-limit.service.js';
import type { IRateLimitService } from './modules/rate-limits/application/ports/rate-limit.port.js';

import { createRequestLogRepository } from './modules/request-logs/infrastructure/persistence/request-log.repository.js';
import { createRequestLogService } from './modules/request-logs/application/services/request-log.service.js';
import type { IRequestLogService } from './modules/request-logs/application/ports/request-log.port.js';

import { createProxyService } from './modules/proxy/application/services/proxy.service.js';
import { createFetchUpstreamClient } from './modules/proxy/infrastructure/clients/upstream.client.js';
import type { IProxyService } from './modules/proxy/application/ports/proxy.port.js';

export type Container = {
  eventBus: EventBus;
  apiKeyService: IApiKeyService;
  rateLimitService: IRateLimitService;
  requestLogService: IRequestLogService;
  proxyService: IProxyService;
  apiKeyGuard: preHandlerHookHandler;
  adminGuard: preHandlerHookHandler;
};

export const buildContainer = (db: Database): Container => {
  const eventBus = createEventBus({
    onError: (error, event) => {
      console.error(`[event-bus] falha no evento ${event.type}`, error);
    },
  });

  // ── Repositórios ──────────────────────────────────────────────────────────
  const apiKeyRepository = createApiKeyRepository(db);
  const rateLimitRepository = createRateLimitRepository(db);
  const requestLogRepository = createRequestLogRepository(db);

  // ── Serviços ──────────────────────────────────────────────────────────────
  const apiKeyService = createApiKeyService(apiKeyRepository, eventBus);
  const rateLimitService = createRateLimitService(rateLimitRepository);
  const requestLogService = createRequestLogService(requestLogRepository);

  const proxyService = createProxyService({
    upstreams: buildUpstreams(env),
    upstreamClient: createFetchUpstreamClient(),
    requestLogs: requestLogService,
    timeoutMs: env.UPSTREAM_TIMEOUT_MS,
  });

  return {
    eventBus,
    apiKeyService,
    rateLimitService,
    requestLogService,
    proxyService,
    apiKeyGuard: createApiKeyGuard(apiKeyService, rateLimitService),
    adminGuard: createAdminGuard(env.GATEWAY_ADMIN_TOKEN),
  };
};

export const container = buildContainer(database);
