import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IAssessmentService } from '../../../application/ports/assessment.port.js';
import {
  assessmentIdSchema,
  evaluateRiskSchema,
  listAssessmentsQuerySchema,
} from '../../../application/dtos/assessment.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'AssessmentController';

export const createAssessmentController = (
  service: IAssessmentService
) => ({
  evaluate: handler(async (request: FastifyRequest, reply) => {
    const parsed = validateWithZod(
      evaluateRiskSchema,
      request.body,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const result = await service.evaluate(parsed.value);
    if (result.success) reply.code(201);
    return result;
  }),

  list: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      listAssessmentsQuerySchema,
      request.query,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const { cursor, pageSize, ...filters } = parsed.value;
    return service.list({ cursor, pageSize }, filters);
  }),

  getById: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      assessmentIdSchema,
      request.params,
      COMPONENT
    );
    if (!parsed.success) return parsed;
    return service.getById(parsed.value.id);
  }),
});
