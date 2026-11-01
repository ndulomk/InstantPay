import type { FastifyPluginAsync } from 'fastify';
import type { IOverviewService } from '../../../application/ports/overview.port.js';
import { createOverviewController } from '../controllers/overview.controller.js';

export type OverviewRoutesOptions = {
  service: IOverviewService;
};

export const overviewRoutes: FastifyPluginAsync<
  OverviewRoutesOptions
> = async (fastify, { service }) => {
  const controller = createOverviewController(service);
  fastify.get('/admin/overview', controller.getOverview);
};
