import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IOverviewService } from '../../../application/ports/overview.port.js';

export const createOverviewController = (
  service: IOverviewService
) => ({
  getOverview: handler(async (_request: FastifyRequest) =>
    service.getOverview()
  ),
});
