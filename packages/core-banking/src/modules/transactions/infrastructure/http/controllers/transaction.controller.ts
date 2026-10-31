import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { ITransactionService } from '../../../application/ports/transaction.port.js';
import {
  depositSchema,
  listTransactionsQuerySchema,
  transactionIdSchema,
  transferSchema,
  withdrawalSchema,
} from '../../../application/dtos/transaction.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'TransactionController';

export const createTransactionController = (service: ITransactionService) => ({
  transfer: handler(
    async (request: FastifyRequest, reply) => {
      const parsed = validateWithZod(transferSchema, request.body, COMPONENT);
      if (!parsed.success) return parsed;

      const result = await service.transfer(
        parsed.value,
        request.user?.userId ?? null,
        request.ip
      );
      if (result.success) reply.code(201);
      return result;
    }
  ),

  deposit: handler(
    async (request: FastifyRequest, reply) => {
      const parsed = validateWithZod(depositSchema, request.body, COMPONENT);
      if (!parsed.success) return parsed;

      const result = await service.deposit(
        parsed.value,
        request.user?.userId ?? null,
        request.ip
      );
      if (result.success) reply.code(201);
      return result;
    }
  ),

  withdraw: handler(
    async (request: FastifyRequest, reply) => {
      const parsed = validateWithZod(withdrawalSchema, request.body, COMPONENT);
      if (!parsed.success) return parsed;

      const result = await service.withdraw(
        parsed.value,
        request.user?.userId ?? null,
        request.ip
      );
      if (result.success) reply.code(201);
      return result;
    }
  ),

  reverse: handler(
    async (request: FastifyRequest, reply) => {
      const parsed = validateWithZod(
        transactionIdSchema,
        request.params,
        COMPONENT
      );
      if (!parsed.success) return parsed;

      const result = await service.reverse(
        parsed.value.id,
        request.user?.userId ?? null,
        request.ip
      );
      if (result.success) reply.code(201);
      return result;
    }
  ),

  list: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      listTransactionsQuerySchema,
      request.query,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    return service.list(parsed.value, {
      accountId: parsed.value.accountId,
      type: parsed.value.type,
      status: parsed.value.status,
      reference: parsed.value.reference,
      from: parsed.value.from,
      to: parsed.value.to,
    });
  }),

  getById: handler(
    async (request: FastifyRequest) => {
      const parsed = validateWithZod(
        transactionIdSchema,
        request.params,
        COMPONENT
      );
      if (!parsed.success) return parsed;
      return service.getById(parsed.value.id);
    }
  ),
});
