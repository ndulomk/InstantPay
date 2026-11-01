import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IMatchingService } from '../../../application/ports/matching.port.js';
import {
  discrepancyIdSchema,
  listDiscrepanciesQuerySchema,
  listMatchesQuerySchema,
  updateDiscrepancySchema,
} from '../../../application/dtos/matching.dto.js';
import { statementIdSchema } from '../../../../statements/application/dtos/statement.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'MatchingController';

const parseStatementId = (request: FastifyRequest) =>
  validateWithZod(statementIdSchema, request.params, COMPONENT);

export const createMatchingController = (
  service: IMatchingService
) => ({
  run: handler(async (request: FastifyRequest) => {
    const parsed = parseStatementId(request);
    if (!parsed.success) return parsed;
    return service.run(parsed.value.id);
  }),

  listMatches: handler(async (request: FastifyRequest) => {
    const params = parseStatementId(request);
    if (!params.success) return params;

    const query = validateWithZod(
      listMatchesQuerySchema,
      request.query,
      COMPONENT
    );
    if (!query.success) return query;

    return service.listMatches(params.value.id, query.value);
  }),

  listDiscrepancies: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      listDiscrepanciesQuerySchema,
      request.query,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const { cursor, pageSize, ...filters } = parsed.value;
    return service.listDiscrepancies({ cursor, pageSize }, filters);
  }),

  getDiscrepancy: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      discrepancyIdSchema,
      request.params,
      COMPONENT
    );
    if (!parsed.success) return parsed;
    return service.getDiscrepancy(parsed.value.id);
  }),

  updateDiscrepancy: handler(async (request: FastifyRequest) => {
    const params = validateWithZod(
      discrepancyIdSchema,
      request.params,
      COMPONENT
    );
    if (!params.success) return params;

    const body = validateWithZod(
      updateDiscrepancySchema,
      request.body,
      COMPONENT
    );
    if (!body.success) return body;

    return service.updateDiscrepancy(params.value.id, body.value);
  }),
});
