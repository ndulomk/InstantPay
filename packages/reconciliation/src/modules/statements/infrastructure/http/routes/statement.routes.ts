import type { FastifyPluginAsync } from 'fastify';
import type { IStatementService } from '../../../application/ports/statement.port.js';
import { createStatementController } from '../controllers/statement.controller.js';

export type StatementRoutesOptions = {
  service: IStatementService;
};

export const statementRoutes: FastifyPluginAsync<
  StatementRoutesOptions
> = async (fastify, { service }) => {
  const controller = createStatementController(service);

  fastify.post('/reconciliation/statements', controller.create);
  fastify.get('/reconciliation/statements', controller.list);
  fastify.get('/reconciliation/statements/:id', controller.getById);
  fastify.post(
    '/reconciliation/statements/:id/entries',
    controller.addEntries
  );
  fastify.get(
    '/reconciliation/statements/:id/entries',
    controller.listEntries
  );
  fastify.patch(
    '/reconciliation/statements/:id/entries/:entryId/status',
    controller.setEntryStatus
  );
};
