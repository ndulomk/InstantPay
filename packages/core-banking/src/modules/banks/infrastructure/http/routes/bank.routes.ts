import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';
import type { IBankService } from '../../../application/ports/bank.port.js';
import { createBankController } from '../controllers/bank.controller.js';

export type BankRoutesOptions = {
  service: IBankService;
  guard: preHandlerHookHandler;
};

export const registerBankRoutes: FastifyPluginAsync<BankRoutesOptions> = async (
  fastify,
  { service, guard }
) => {
  const controller = createBankController(service);

  fastify.post('/banks', { preHandler: guard }, controller.create);
  fastify.get('/banks', { preHandler: guard }, controller.list);
  fastify.get('/banks/:id', { preHandler: guard }, controller.getById);
  fastify.patch('/banks/:id', { preHandler: guard }, controller.update);
  fastify.delete('/banks/:id', { preHandler: guard }, controller.remove);
};
