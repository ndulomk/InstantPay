import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';
import type { ITransactionLimitService } from '../../../application/ports/limit.port.js';
import { createTransactionLimitController } from '../controllers/limit.controller.js';

export type LimitRoutesOptions = {
  service: ITransactionLimitService;
  guard: preHandlerHookHandler;
};

export const registerLimitRoutes: FastifyPluginAsync<LimitRoutesOptions> = async (
  fastify,
  { service, guard }
) => {
  const controller = createTransactionLimitController(service);

  fastify.get('/limits', { preHandler: guard }, controller.list);
  fastify.get('/limits/:accountId', { preHandler: guard }, controller.get);
  fastify.put('/limits/:accountId', { preHandler: guard }, controller.upsert);
};
