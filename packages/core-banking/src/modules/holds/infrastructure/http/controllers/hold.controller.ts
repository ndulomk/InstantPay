import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IHoldService } from '../../../application/ports/hold.port.js';
import {
  createHoldSchema,
  holdIdSchema,
  listHoldsQuerySchema,
} from '../../../application/dtos/hold.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'HoldController';

export const createHoldController = (service: IHoldService) => ({
  create: handler(async (request: FastifyRequest, reply) => {
    const parsed = validateWithZod(createHoldSchema, request.body, COMPONENT);
    if (!parsed.success) return parsed;

    const result = await service.create(
      parsed.value,
      request.user?.userId ?? null
    );
    if (result.success) reply.code(201);
    return result;
  }),

  list: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(listHoldsQuerySchema, request.query, COMPONENT);
    if (!parsed.success) return parsed;

    return service.list(parsed.value, {
      accountId: parsed.value.accountId,
      released: parsed.value.released,
      from: parsed.value.from,
      to: parsed.value.to,
    });
  }),

  getById: handler(
    async (request: FastifyRequest) => {
      const parsed = validateWithZod(holdIdSchema, request.params, COMPONENT);
      if (!parsed.success) return parsed;
      return service.getById(parsed.value.id);
    }
  ),

  release: handler(
    async (request: FastifyRequest) => {
      const parsed = validateWithZod(holdIdSchema, request.params, COMPONENT);
      if (!parsed.success) return parsed;
      return service.release(parsed.value.id, request.user?.userId ?? null);
    }
  ),
});
