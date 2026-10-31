import { handler, Ok } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IBankService } from '../../../application/ports/bank.port.js';
import {
  bankIdSchema,
  createBankSchema,
  listBanksQuerySchema,
  updateBankSchema,
} from '../../../application/dtos/bank.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'BankController';

export const createBankController = (service: IBankService) => ({
  create: handler(async (request: FastifyRequest, reply) => {
    const parsed = validateWithZod(createBankSchema, request.body, COMPONENT);
    if (!parsed.success) return parsed;

    const result = await service.create(
      parsed.value,
      request.user?.userId ?? null
    );
    if (result.success) reply.code(201);
    return result;
  }),

  list: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(listBanksQuerySchema, request.query, COMPONENT);
    if (!parsed.success) return parsed;

    return service.list(parsed.value, {
      search: parsed.value.search,
      status: parsed.value.status,
    });
  }),

  getById: handler(
    async (request: FastifyRequest) => {
      const parsed = validateWithZod(bankIdSchema, request.params, COMPONENT);
      if (!parsed.success) return parsed;
      return service.getById(parsed.value.id);
    }
  ),

  update: handler(
    async (
      request: FastifyRequest
    ) => {
      const params = validateWithZod(bankIdSchema, request.params, COMPONENT);
      if (!params.success) return params;

      const body = validateWithZod(updateBankSchema, request.body, COMPONENT);
      if (!body.success) return body;

      return service.update(
        params.value.id,
        body.value,
        request.user?.userId ?? null
      );
    }
  ),

  remove: handler(
    async (request: FastifyRequest) => {
      const parsed = validateWithZod(bankIdSchema, request.params, COMPONENT);
      if (!parsed.success) return parsed;

      const result = await service.delete(
        parsed.value.id,
        request.user?.userId ?? null
      );
      if (!result.success) return result;
      return Ok({ message: 'Banco removido com sucesso' });
    }
  ),
});
