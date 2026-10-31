import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';
import type { IReserveService } from '../../../application/ports/reserve.port.js';
import { createReserveController } from '../controllers/reserve.controller.js';

export type ReserveRoutesOptions = {
  service: IReserveService;
  guard: preHandlerHookHandler;
};

export const registerReserveRoutes: FastifyPluginAsync<
  ReserveRoutesOptions
> = async (fastify, { service, guard }) => {
  const controller = createReserveController(service);

  fastify.post('/reserves', { preHandler: guard }, controller.calculate);
  fastify.get('/reserves', { preHandler: guard }, controller.list);
  fastify.get('/reserves/:id', { preHandler: guard }, controller.getById);
  fastify.get(
    '/reserves/banks/:bankId/latest',
    { preHandler: guard },
    controller.getLatestByBank
  );
};
