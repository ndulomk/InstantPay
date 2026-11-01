import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IFeatureFlagService } from '../../../application/ports/feature-flag.port.js';
import {
  createFeatureFlagSchema,
  evaluateFeatureFlagSchema,
  featureFlagIdSchema,
  featureFlagKeySchema,
  flagActiveSchema,
  listFeatureFlagsQuerySchema,
  updateFeatureFlagSchema,
} from '../../../application/dtos/feature-flag.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'FeatureFlagController';

const parseId = (request: FastifyRequest) =>
  validateWithZod(featureFlagIdSchema, request.params, COMPONENT);

export const createFeatureFlagController = (
  service: IFeatureFlagService
) => ({
  create: handler(async (request: FastifyRequest, reply) => {
    const parsed = validateWithZod(
      createFeatureFlagSchema,
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
      listFeatureFlagsQuerySchema,
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

  update: handler(async (request: FastifyRequest) => {
    const params = parseId(request);
    if (!params.success) return params;

    const body = validateWithZod(
      updateFeatureFlagSchema,
      request.body,
      COMPONENT
    );
    if (!body.success) return body;

    return service.update(params.value.id, body.value);
  }),

  setEnabled: handler(async (request: FastifyRequest) => {
    const params = parseId(request);
    if (!params.success) return params;

    const body = validateWithZod(
      flagActiveSchema,
      request.body,
      COMPONENT
    );
    if (!body.success) return body;

    return service.setEnabled(params.value.id, body.value.isEnabled);
  }),

  evaluate: handler(async (request: FastifyRequest) => {
    const params = validateWithZod(
      featureFlagKeySchema,
      request.params,
      COMPONENT
    );
    if (!params.success) return params;

    const body = validateWithZod(
      evaluateFeatureFlagSchema,
      request.body,
      COMPONENT
    );
    if (!body.success) return body;

    return service.evaluate(params.value.key, body.value.subjectId);
  }),
});
