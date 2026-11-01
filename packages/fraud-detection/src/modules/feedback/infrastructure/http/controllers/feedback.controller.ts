import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IFeedbackService } from '../../../application/ports/feedback.port.js';
import {
  createFeedbackSchema,
  listFeedbackQuerySchema,
} from '../../../application/dtos/feedback.dto.js';
import { assessmentIdSchema } from '../../../../assessments/application/dtos/assessment.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'FeedbackController';

const ipAddress = (request: FastifyRequest): string => {
  const forwarded = request.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(',')[0]?.trim() ?? request.ip;
};

export const createFeedbackController = (service: IFeedbackService) => ({
  create: handler(async (request: FastifyRequest, reply) => {
    const params = validateWithZod(
      assessmentIdSchema,
      request.params,
      COMPONENT
    );
    if (!params.success) return params;

    const body = validateWithZod(
      createFeedbackSchema,
      request.body,
      COMPONENT
    );
    if (!body.success) return body;

    const result = await service.create(
      params.value.id,
      body.value,
      undefined,
      ipAddress(request)
    );
    if (result.success) reply.code(201);
    return result;
  }),

  list: handler(async (request: FastifyRequest) => {
    const params = validateWithZod(
      assessmentIdSchema,
      request.params,
      COMPONENT
    );
    if (!params.success) return params;

    const query = validateWithZod(
      listFeedbackQuerySchema,
      request.query,
      COMPONENT
    );
    if (!query.success) return query;

    const { cursor, pageSize, outcome } = query.value;
    return service.list(
      params.value.id,
      { cursor, pageSize },
      { outcome }
    );
  }),
});
