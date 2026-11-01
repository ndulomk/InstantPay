import type { FastifyPluginAsync } from 'fastify';
import type { INotificationService } from '../../../application/ports/notification.port.js';
import { createNotificationController } from '../controllers/notification.controller.js';

export type NotificationRoutesOptions = {
  service: INotificationService;
};

export const notificationRoutes: FastifyPluginAsync<
  NotificationRoutesOptions
> = async (fastify, { service }) => {
  const controller = createNotificationController(service);

  fastify.post('/notifications', controller.create);
  fastify.get('/notifications', controller.list);
  fastify.get('/notifications/:id', controller.getById);
  fastify.post('/notifications/:id/retry', controller.retry);
  fastify.post('/notifications/:id/cancel', controller.cancel);
  fastify.get('/notifications/:id/deliveries', controller.listDeliveries);
};
