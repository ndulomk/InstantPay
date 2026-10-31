import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';
import type { ILedgerService } from '../../../application/ports/ledger.port.js';
import { createLedgerController } from '../controllers/ledger.controller.js';

export type LedgerRoutesOptions = {
  service: ILedgerService;
  guard: preHandlerHookHandler;
};

export const registerLedgerRoutes: FastifyPluginAsync<
  LedgerRoutesOptions
> = async (fastify, { service, guard }) => {
  const controller = createLedgerController(service);

  fastify.get('/ledger/entries', { preHandler: guard }, controller.list);
  fastify.get(
    '/ledger/accounts/:accountId/entries',
    { preHandler: guard },
    controller.listByAccount
  );
  fastify.get(
    '/ledger/transactions/:transactionId/entries',
    { preHandler: guard },
    controller.listByTransaction
  );
};
