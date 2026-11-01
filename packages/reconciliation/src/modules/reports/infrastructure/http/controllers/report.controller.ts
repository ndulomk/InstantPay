import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IReportService } from '../../../application/ports/report.port.js';
import { summaryQuerySchema } from '../../../application/dtos/report.dto.js';
import { statementIdSchema } from '../../../../statements/application/dtos/statement.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'ReportController';

export const createReportController = (service: IReportService) => ({
  summary: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      summaryQuerySchema,
      request.query,
      COMPONENT
    );
    if (!parsed.success) return parsed;
    return service.getSummary(parsed.value);
  }),

  statementReport: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      statementIdSchema,
      request.params,
      COMPONENT
    );
    if (!parsed.success) return parsed;
    return service.getStatementReport(parsed.value.id);
  }),
});
