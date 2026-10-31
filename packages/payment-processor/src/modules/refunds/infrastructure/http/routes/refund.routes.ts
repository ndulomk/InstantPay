import type { FastifyPluginAsync } from 'fastify';
import type { IRefundService } from '../../../application/ports/refund.port.js';
import { createRefundController } from '../controllers/refund.controller.js';

export type RefundRoutesOptions = {
  service: IRefundService;
};

export const refundRoutes: FastifyPluginAsync<
  RefundRoutesOptions
> = async (fastify, { service }) => {
  const controller = createRefundController(service);

  fastify.post('/payments/:id/refunds', controller.create);
  fastify.get('/payments/:id/refunds', controller.list);
  fastify.get('/refunds/:id', controller.getById);
};
