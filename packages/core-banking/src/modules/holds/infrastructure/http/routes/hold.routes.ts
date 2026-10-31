import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';
import type { IHoldService } from '../../../application/ports/hold.port.js';
import { createHoldController } from '../controllers/hold.controller.js';

export type HoldRoutesOptions = {
  service: IHoldService;
  guard: preHandlerHookHandler;
};

export const registerHoldRoutes: FastifyPluginAsync<HoldRoutesOptions> = async (
  fastify,
  { service, guard }
) => {
  const controller = createHoldController(service);

  fastify.post('/holds', { preHandler: guard }, controller.create);
  fastify.get('/holds', { preHandler: guard }, controller.list);
  fastify.get('/holds/:id', { preHandler: guard }, controller.getById);
  fastify.post('/holds/:id/release', { preHandler: guard }, controller.release);
};
