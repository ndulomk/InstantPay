import type { FastifyPluginAsync } from 'fastify';
import type { ITemplateService } from '../../../application/ports/template.port.js';
import { createTemplateController } from '../controllers/template.controller.js';

export type TemplateRoutesOptions = {
  service: ITemplateService;
};

export const templateRoutes: FastifyPluginAsync<TemplateRoutesOptions> = async (
  fastify,
  { service }
) => {
  const controller = createTemplateController(service);

  fastify.post('/notifications/templates', controller.create);
  fastify.get('/notifications/templates', controller.list);
  fastify.get('/notifications/templates/:id', controller.getById);
  fastify.patch('/notifications/templates/:id', controller.update);
  fastify.patch('/notifications/templates/:id/status', controller.setActive);
};
