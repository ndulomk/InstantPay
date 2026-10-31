import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';
import type { ITransactionService } from '../../../application/ports/transaction.port.js';
import { createTransactionController } from '../controllers/transaction.controller.js';

export type TransactionRoutesOptions = {
  service: ITransactionService;
  guard: preHandlerHookHandler;
};

export const registerTransactionRoutes: FastifyPluginAsync<
  TransactionRoutesOptions
> = async (fastify, { service, guard }) => {
  const controller = createTransactionController(service);

  fastify.post(
    '/transactions/transfer',
    { preHandler: guard },
    controller.transfer
  );
  fastify.post(
    '/transactions/deposit',
    { preHandler: guard },
    controller.deposit
  );
  fastify.post(
    '/transactions/withdraw',
    { preHandler: guard },
    controller.withdraw
  );
  fastify.post(
    '/transactions/:id/reverse',
    { preHandler: guard },
    controller.reverse
  );
  fastify.get('/transactions', { preHandler: guard }, controller.list);
  fastify.get('/transactions/:id', { preHandler: guard }, controller.getById);
};
