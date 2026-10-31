import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';
import type { IUserService } from '../../../application/ports/user.port.js';
import { createUserController } from '../controllers/user.controller.js';

export type UserRoutesOptions = {
  service: IUserService;
  guard: preHandlerHookHandler;
};

export const registerUserRoutes: FastifyPluginAsync<UserRoutesOptions> = async (
  fastify,
  { service, guard }
) => {
  const controller = createUserController(service);

  fastify.post('/users', { preHandler: guard }, controller.create);
  fastify.get('/users', { preHandler: guard }, controller.list);
  fastify.get('/users/:id', { preHandler: guard }, controller.getById);
  fastify.patch('/users/:id', { preHandler: guard }, controller.update);
  fastify.patch('/users/:id/deactivate', { preHandler: guard }, controller.deactivate);
  fastify.patch('/users/:id/activate', { preHandler: guard }, controller.activate);
  fastify.delete('/users/:id', { preHandler: guard }, controller.remove);
};
