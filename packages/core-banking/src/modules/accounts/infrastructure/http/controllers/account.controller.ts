import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IAccountService } from '../../../application/ports/account.port.js';
import {
  accountIdSchema,
  accountNumberSchema,
  createAccountSchema,
  listAccountsQuerySchema,
  updateAccountStatusSchema,
} from '../../../application/dtos/account.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'AccountController';

export const createAccountController = (service: IAccountService) => ({
  create: handler(async (request: FastifyRequest, reply) => {
    const parsed = validateWithZod(createAccountSchema, request.body, COMPONENT);
    if (!parsed.success) return parsed;

    const result = await service.create(
      parsed.value,
      request.user?.userId ?? null
    );
    if (result.success) reply.code(201);
    return result;
  }),

  list: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      listAccountsQuerySchema,
      request.query,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    return service.list(parsed.value, {
      userId: parsed.value.userId,
      bankId: parsed.value.bankId,
      status: parsed.value.status,
      accountType: parsed.value.accountType,
    });
  }),

  getById: handler(
    async (request: FastifyRequest) => {
      const parsed = validateWithZod(accountIdSchema, request.params, COMPONENT);
      if (!parsed.success) return parsed;
      return service.getById(parsed.value.id);
    }
  ),

  getByNumber: handler(
    async (
      request: FastifyRequest
    ) => {
      const parsed = validateWithZod(
        accountNumberSchema,
        request.params,
        COMPONENT
      );
      if (!parsed.success) return parsed;
      return service.getByNumber(parsed.value.accountNumber);
    }
  ),

  updateStatus: handler(
    async (
      request: FastifyRequest
    ) => {
      const params = validateWithZod(accountIdSchema, request.params, COMPONENT);
      if (!params.success) return params;

      const body = validateWithZod(
        updateAccountStatusSchema,
        request.body,
        COMPONENT
      );
      if (!body.success) return body;

      return service.updateStatus(
        params.value.id,
        body.value.status,
        request.user?.userId ?? null
      );
    }
  ),

  getBalance: handler(
    async (request: FastifyRequest) => {
      const parsed = validateWithZod(accountIdSchema, request.params, COMPONENT);
      if (!parsed.success) return parsed;

      const result = await service.getById(parsed.value.id);
      if (!result.success) return result;

      return {
        success: true as const,
        value: {
          accountId: result.value.id,
          accountNumber: result.value.accountNumber,
          balance: result.value.balance,
          availableBalance: result.value.availableBalance,
          blockedAmount: result.value.blockedAmount,
          currencyCode: result.value.currencyCode,
          status: result.value.status,
        },
      };
    }
  ),
});
