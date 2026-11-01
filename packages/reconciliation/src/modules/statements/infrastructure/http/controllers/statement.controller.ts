import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IStatementService } from '../../../application/ports/statement.port.js';
import {
  createEntriesSchema,
  createStatementSchema,
  entryParamsSchema,
  entryStatusSchema,
  listEntriesQuerySchema,
  listStatementsQuerySchema,
  statementIdSchema,
} from '../../../application/dtos/statement.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'StatementController';

const parseId = (request: FastifyRequest) =>
  validateWithZod(statementIdSchema, request.params, COMPONENT);

export const createStatementController = (
  service: IStatementService
) => ({
  create: handler(async (request: FastifyRequest, reply) => {
    const parsed = validateWithZod(
      createStatementSchema,
      request.body,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const result = await service.create(parsed.value);
    if (result.success) reply.code(201);
    return result;
  }),

  list: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      listStatementsQuerySchema,
      request.query,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const { cursor, pageSize, ...filters } = parsed.value;
    return service.list({ cursor, pageSize }, filters);
  }),

  getById: handler(async (request: FastifyRequest) => {
    const parsed = parseId(request);
    if (!parsed.success) return parsed;
    return service.getById(parsed.value.id);
  }),

  addEntries: handler(async (request: FastifyRequest, reply) => {
    const params = parseId(request);
    if (!params.success) return params;

    const body = validateWithZod(
      createEntriesSchema,
      request.body,
      COMPONENT
    );
    if (!body.success) return body;

    const result = await service.addEntries(
      params.value.id,
      body.value.entries
    );
    if (result.success) reply.code(201);
    return result;
  }),

  listEntries: handler(async (request: FastifyRequest) => {
    const params = parseId(request);
    if (!params.success) return params;

    const query = validateWithZod(
      listEntriesQuerySchema,
      request.query,
      COMPONENT
    );
    if (!query.success) return query;

    const { cursor, pageSize, ...filters } = query.value;
    return service.listEntries(
      params.value.id,
      { cursor, pageSize },
      filters
    );
  }),

  setEntryStatus: handler(async (request: FastifyRequest) => {
    const params = validateWithZod(
      entryParamsSchema,
      request.params,
      COMPONENT
    );
    if (!params.success) return params;

    const body = validateWithZod(
      entryStatusSchema,
      request.body,
      COMPONENT
    );
    if (!body.success) return body;

    return service.setEntryStatus(
      params.value.id,
      params.value.entryId,
      body.value.status
    );
  }),
});
