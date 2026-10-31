import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';
import type { IAccountService } from '../../../application/ports/account.port.js';
import { createAccountController } from '../controllers/account.controller.js';

export type AccountRoutesOptions = {
  service: IAccountService;
  guard: preHandlerHookHandler;
};

export const registerAccountRoutes: FastifyPluginAsync<
  AccountRoutesOptions
> = async (fastify, { service, guard }) => {
  const controller = createAccountController(service);

  fastify.post('/accounts', { preHandler: guard }, controller.create);
  fastify.get('/accounts', { preHandler: guard }, controller.list);
  fastify.get(
    '/accounts/number/:accountNumber',
    { preHandler: guard },
    controller.getByNumber
  );
  fastify.get('/accounts/:id', { preHandler: guard }, controller.getById);
  fastify.get(
    '/accounts/:id/balance',
    { preHandler: guard },
    controller.getBalance
  );
  fastify.patch(
    '/accounts/:id/status',
    { preHandler: guard },
    controller.updateStatus
  );
};
