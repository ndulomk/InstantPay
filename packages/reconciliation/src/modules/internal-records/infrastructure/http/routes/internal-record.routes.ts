import type { FastifyPluginAsync } from 'fastify';
import type { IInternalRecordService } from '../../../application/ports/internal-record.port.js';
import { createInternalRecordController } from '../controllers/internal-record.controller.js';

export type InternalRecordRoutesOptions = {
  service: IInternalRecordService;
};

export const internalRecordRoutes: FastifyPluginAsync<
  InternalRecordRoutesOptions
> = async (fastify, { service }) => {
  const controller = createInternalRecordController(service);

  fastify.post('/reconciliation/internal-records', controller.create);
  fastify.get('/reconciliation/internal-records', controller.list);
  fastify.get(
    '/reconciliation/internal-records/:id',
    controller.getById
  );
};
