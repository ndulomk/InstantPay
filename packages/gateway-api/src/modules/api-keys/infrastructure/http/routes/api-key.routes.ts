import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';
import type { IApiKeyService } from '../../../application/ports/api-key.port.js';
import { createApiKeyController } from '../controllers/api-key.controller.js';

export type ApiKeyRoutesOptions = {
  service: IApiKeyService;
  adminGuard: preHandlerHookHandler;
};

export const apiKeyRoutes: FastifyPluginAsync<ApiKeyRoutesOptions> = async (
  fastify,
  { service, adminGuard }
) => {
  const controller = createApiKeyController(service);
  fastify.addHook('preHandler', adminGuard);

  fastify.post('/gateway/api-keys', controller.create);
  fastify.get('/gateway/api-keys', controller.list);
  fastify.get('/gateway/api-keys/:id', controller.getById);
  fastify.post('/gateway/api-keys/:id/revoke', controller.revoke);
};
