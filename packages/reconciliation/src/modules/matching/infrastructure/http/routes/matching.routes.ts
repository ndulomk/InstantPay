import type { FastifyPluginAsync } from 'fastify';
import type { IMatchingService } from '../../../application/ports/matching.port.js';
import { createMatchingController } from '../controllers/matching.controller.js';

export type MatchingRoutesOptions = {
  service: IMatchingService;
};

export const matchingRoutes: FastifyPluginAsync<
  MatchingRoutesOptions
> = async (fastify, { service }) => {
  const controller = createMatchingController(service);

  fastify.post(
    '/reconciliation/statements/:id/run',
    controller.run
  );
  fastify.get(
    '/reconciliation/statements/:id/matches',
    controller.listMatches
  );
  fastify.get(
    '/reconciliation/discrepancies',
    controller.listDiscrepancies
  );
  fastify.get(
    '/reconciliation/discrepancies/:id',
    controller.getDiscrepancy
  );
  fastify.patch(
    '/reconciliation/discrepancies/:id',
    controller.updateDiscrepancy
  );
};
