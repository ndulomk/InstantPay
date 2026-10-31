import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IApiKeyService } from '../../../application/ports/api-key.port.js';
import {
  apiKeyIdSchema,
  createApiKeySchema,
  listApiKeysQuerySchema,
} from '../../../application/dtos/api-key.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'ApiKeyController';

export const createApiKeyController = (service: IApiKeyService) => ({
  create: handler(async (request: FastifyRequest, reply) => {
    const parsed = validateWithZod(
      createApiKeySchema,
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
      listApiKeysQuerySchema,
      request.query,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const { cursor, pageSize, isActive, search } = parsed.value;
    return service.list(
      { cursor, pageSize },
      { isActive, search }
    );
  }),

  getById: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      apiKeyIdSchema,
      request.params,
      COMPONENT
    );
    if (!parsed.success) return parsed;
    return service.getById(parsed.value.id);
  }),

  revoke: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      apiKeyIdSchema,
      request.params,
      COMPONENT
    );
    if (!parsed.success) return parsed;
    return service.revoke(parsed.value.id);
  }),
});
