import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';
import type { IAuthService } from '../../../application/ports/auth.port.js';
import { createAuthController } from '../controllers/auth.controller.js';

export type AuthRoutesOptions = {
  service: IAuthService;
  guard: preHandlerHookHandler;
};

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  fastify,
  { service, guard }
) => {
  const controller = createAuthController(service);

  fastify.post('/auth/register', controller.register);
  fastify.post('/auth/login', controller.login);
  fastify.post('/auth/refresh', controller.refresh);
  fastify.post('/auth/logout', { preHandler: guard }, controller.logout);
  fastify.get('/auth/me', { preHandler: guard }, controller.me);
};
