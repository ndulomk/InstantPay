import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';
import type { IRateLimitService } from '../../../application/ports/rate-limit.port.js';
import { createRateLimitController } from '../controllers/rate-limit.controller.js';

export type RateLimitRoutesOptions = {
  service: IRateLimitService;
  apiKeyGuard: preHandlerHookHandler;
};

export const rateLimitRoutes: FastifyPluginAsync<
  RateLimitRoutesOptions
> = async (fastify, { service, apiKeyGuard }) => {
  const controller = createRateLimitController(service);

  fastify.get(
    '/gateway/usage',
    { preHandler: apiKeyGuard },
    controller.usage
  );
};
