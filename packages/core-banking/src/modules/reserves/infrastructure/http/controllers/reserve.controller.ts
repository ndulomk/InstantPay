import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IReserveService } from '../../../application/ports/reserve.port.js';
import {
  calculateReserveSchema,
  listReservesQuerySchema,
  reserveBankParamSchema,
  reserveIdSchema,
} from '../../../application/dtos/reserve.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'ReserveController';

export const createReserveController = (service: IReserveService) => ({
  calculate: handler(
    async (request: FastifyRequest, reply) => {
      const parsed = validateWithZod(
        calculateReserveSchema,
        request.body,
        COMPONENT
      );
      if (!parsed.success) return parsed;

      const result = await service.calculate(
        parsed.value,
        request.user?.userId ?? null
      );
      if (result.success) reply.code(201);
      return result;
    }
  ),

  list: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      listReservesQuerySchema,
      request.query,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    return service.list(parsed.value, {
      bankId: parsed.value.bankId,
      compliant: parsed.value.compliant,
      from: parsed.value.from,
      to: parsed.value.to,
    });
  }),

  getById: handler(
    async (request: FastifyRequest) => {
      const parsed = validateWithZod(reserveIdSchema, request.params, COMPONENT);
      if (!parsed.success) return parsed;
      return service.getById(parsed.value.id);
    }
  ),

  getLatestByBank: handler(
    async (request: FastifyRequest) => {
      const parsed = validateWithZod(
        reserveBankParamSchema,
        request.params,
        COMPONENT
      );
      if (!parsed.success) return parsed;
      return service.getLatestByBank(parsed.value.bankId);
    }
  ),
});
