import type { FastifyPluginAsync } from 'fastify';
import type { IPaymentService } from '../../../application/ports/payment.port.js';
import { createPaymentController } from '../controllers/payment.controller.js';

export type PaymentRoutesOptions = {
  service: IPaymentService;
};

export const paymentRoutes: FastifyPluginAsync<
  PaymentRoutesOptions
> = async (fastify, { service }) => {
  const controller = createPaymentController(service);

  fastify.post('/payments', controller.create);
  fastify.get('/payments', controller.list);
  fastify.get('/payments/reference/:reference', controller.getByReference);
  fastify.get('/payments/:id', controller.getById);
  fastify.post('/payments/:id/cancel', controller.cancel);
};
