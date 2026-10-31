import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IRequestLogService } from '../../../application/ports/request-log.port.js';
import { listRequestLogsQuerySchema } from '../../../application/dtos/request-log.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'RequestLogController';

export const createRequestLogController = (
  service: IRequestLogService
) => ({
  list: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      listRequestLogsQuerySchema,
      request.query,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const { cursor, pageSize, ...filters } = parsed.value;
    return service.list({ cursor, pageSize }, filters);
  }),
});
