import type { FastifyPluginAsync } from 'fastify';
import type { IWebhookService } from '../../../application/ports/webhook.port.js';
import { createWebhookController } from '../controllers/webhook.controller.js';

export type WebhookRoutesOptions = {
  service: IWebhookService;
};

export const webhookRoutes: FastifyPluginAsync<
  WebhookRoutesOptions
> = async (fastify, { service }) => {
  const controller = createWebhookController(service);

  fastify.post('/payments/webhooks/:provider', controller.handle);
};
