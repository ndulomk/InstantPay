import type { FastifyPluginAsync } from 'fastify';
import type { IFeatureFlagService } from '../../../application/ports/feature-flag.port.js';
import { createFeatureFlagController } from '../controllers/feature-flag.controller.js';

export type FeatureFlagRoutesOptions = {
  service: IFeatureFlagService;
};

export const featureFlagRoutes: FastifyPluginAsync<
  FeatureFlagRoutesOptions
> = async (fastify, { service }) => {
  const controller = createFeatureFlagController(service);

  fastify.post('/admin/feature-flags', controller.create);
  fastify.get('/admin/feature-flags', controller.list);
  fastify.get('/admin/feature-flags/:id', controller.getById);
  fastify.patch('/admin/feature-flags/:id', controller.update);
  fastify.patch(
    '/admin/feature-flags/:id/status',
    controller.setEnabled
  );
  fastify.post(
    '/admin/feature-flags/:key/evaluate',
    controller.evaluate
  );
};
