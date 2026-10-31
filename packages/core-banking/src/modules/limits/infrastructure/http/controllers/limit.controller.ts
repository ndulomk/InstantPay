import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { ITransactionLimitService } from '../../../application/ports/limit.port.js';
import {
  accountLimitParamSchema,
  listLimitsQuerySchema,
  upsertTransactionLimitSchema,
} from '../../../application/dtos/limit.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'TransactionLimitController';

export const createTransactionLimitController = (
  service: ITransactionLimitService
) => ({
  list: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(listLimitsQuerySchema, request.query, COMPONENT);
    if (!parsed.success) return parsed;
    return service.list(parsed.value, { accountId: parsed.value.accountId });
  }),

  get: handler(
    async (request: FastifyRequest) => {
      const parsed = validateWithZod(
        accountLimitParamSchema,
        request.params,
        COMPONENT
      );
      if (!parsed.success) return parsed;
      return service.get(parsed.value.accountId);
    }
  ),

  upsert: handler(
    async (
      request: FastifyRequest
    ) => {
      const params = validateWithZod(
        accountLimitParamSchema,
        request.params,
        COMPONENT
      );
      if (!params.success) return params;

      const body = validateWithZod(
        upsertTransactionLimitSchema,
        request.body,
        COMPONENT
      );
      if (!body.success) return body;

      return service.upsert(
        params.value.accountId,
        body.value,
        request.user?.userId ?? null
      );
    }
  ),
});
