import type { FastifyPluginAsync } from 'fastify';
import type { IIncidentService } from '../../../application/ports/incident.port.js';
import { createIncidentController } from '../controllers/incident.controller.js';

export type IncidentRoutesOptions = {
  service: IIncidentService;
};

export const incidentRoutes: FastifyPluginAsync<
  IncidentRoutesOptions
> = async (fastify, { service }) => {
  const controller = createIncidentController(service);

  fastify.post('/admin/incidents', controller.create);
  fastify.get('/admin/incidents', controller.list);
  fastify.get('/admin/incidents/:id', controller.getById);
  fastify.patch('/admin/incidents/:id', controller.update);
  fastify.patch('/admin/incidents/:id/status', controller.changeStatus);
};
