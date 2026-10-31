import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';
import type { IProxyService } from '../../../application/ports/proxy.port.js';
import { createProxyController } from '../controllers/proxy.controller.js';

export type ProxyRoutesOptions = {
  service: IProxyService;
  apiKeyGuard: preHandlerHookHandler;
};

export const proxyRoutes: FastifyPluginAsync<ProxyRoutesOptions> = async (
  fastify,
  { service, apiKeyGuard }
) => {
  const controller = createProxyController(service);

  fastify.all('/', { preHandler: apiKeyGuard }, controller.forward);
  fastify.all('/*', { preHandler: apiKeyGuard }, controller.forward);
};
