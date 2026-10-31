import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IAuditService } from '../../../application/ports/audit.port.js';
import { listAuditQuerySchema } from '../../../application/dtos/audit.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'AuditController';

export const createAuditController = (service: IAuditService) => ({
  list: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(listAuditQuerySchema, request.query, COMPONENT);
    if (!parsed.success) return parsed;
    return service.list(parsed.value);
  }),
});
