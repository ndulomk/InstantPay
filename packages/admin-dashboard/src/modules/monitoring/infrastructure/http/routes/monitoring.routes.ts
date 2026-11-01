import type { FastifyPluginAsync } from 'fastify';
import type { IMonitoringService } from '../../../application/ports/monitoring.port.js';
import { createMonitoringController } from '../controllers/monitoring.controller.js';

export type MonitoringRoutesOptions = {
  service: IMonitoringService;
};

export const monitoringRoutes: FastifyPluginAsync<
  MonitoringRoutesOptions
> = async (fastify, { service }) => {
  const controller = createMonitoringController(service);

  fastify.post('/admin/services', controller.createService);
  fastify.get('/admin/services', controller.listServices);
  fastify.get('/admin/services/:id', controller.getService);
  fastify.patch('/admin/services/:id', controller.updateService);
  fastify.patch(
    '/admin/services/:id/status',
    controller.setServiceActive
  );
  fastify.delete('/admin/services/:id', controller.removeService);
  fastify.post('/admin/health/check', controller.runChecks);
  fastify.get('/admin/health/checks', controller.listChecks);
};
