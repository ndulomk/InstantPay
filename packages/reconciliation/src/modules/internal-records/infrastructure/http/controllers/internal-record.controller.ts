import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IInternalRecordService } from '../../../application/ports/internal-record.port.js';
import {
  createInternalRecordsSchema,
  internalRecordIdSchema,
  listInternalRecordsQuerySchema,
} from '../../../application/dtos/internal-record.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'InternalRecordController';

export const createInternalRecordController = (
  service: IInternalRecordService
) => ({
  create: handler(async (request: FastifyRequest, reply) => {
    const parsed = validateWithZod(
      createInternalRecordsSchema,
      request.body,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const result = await service.createMany(parsed.value.records);
    if (result.success) reply.code(201);
    return result;
  }),

  list: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      listInternalRecordsQuerySchema,
      request.query,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const { cursor, pageSize, ...filters } = parsed.value;
    return service.list({ cursor, pageSize }, filters);
  }),

  getById: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      internalRecordIdSchema,
      request.params,
      COMPONENT
    );
    if (!parsed.success) return parsed;
    return service.getById(parsed.value.id);
  }),
});
