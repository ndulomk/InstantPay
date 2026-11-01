import type { FastifyPluginAsync } from 'fastify';
import type { IReportService } from '../../../application/ports/report.port.js';
import { createReportController } from '../controllers/report.controller.js';

export type ReportRoutesOptions = {
  service: IReportService;
};

export const reportRoutes: FastifyPluginAsync<ReportRoutesOptions> = async (
  fastify,
  { service }
) => {
  const controller = createReportController(service);

  fastify.get('/reconciliation/reports/summary', controller.summary);
  fastify.get(
    '/reconciliation/statements/:id/report',
    controller.statementReport
  );
};
