import { handler, Ok } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IUserService } from '../../../application/ports/user.port.js';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdSchema,
} from '../../../application/dtos/user.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'UserController';

export const createUserController = (service: IUserService) => ({
  create: handler(async (request: FastifyRequest, reply) => {
    const parsed = validateWithZod(createUserSchema, request.body, COMPONENT);
    if (!parsed.success) return parsed;

    const result = await service.create(parsed.value, request.user?.userId ?? null);
    if (result.success) reply.code(201);
    return result;
  }),

  list: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(listUsersQuerySchema, request.query, COMPONENT);
    if (!parsed.success) return parsed;

    return service.list(parsed.value, {
      search: parsed.value.search,
      kycStatus: parsed.value.kycStatus,
      isActive: parsed.value.isActive,
    });
  }),

  getById: handler(
    async (request: FastifyRequest) => {
      const parsed = validateWithZod(userIdSchema, request.params, COMPONENT);
      if (!parsed.success) return parsed;
      return service.getById(parsed.value.id);
    }
  ),

  update: handler(
    async (
      request: FastifyRequest
    ) => {
      const params = validateWithZod(userIdSchema, request.params, COMPONENT);
      if (!params.success) return params;

      const body = validateWithZod(updateUserSchema, request.body, COMPONENT);
      if (!body.success) return body;

      return service.update(
        params.value.id,
        body.value,
        request.user?.userId ?? null
      );
    }
  ),

  deactivate: handler(
    async (request: FastifyRequest) => {
      const parsed = validateWithZod(userIdSchema, request.params, COMPONENT);
      if (!parsed.success) return parsed;
      return service.deactivate(
        parsed.value.id,
        request.user?.userId ?? null
      );
    }
  ),

  activate: handler(
    async (request: FastifyRequest) => {
      const parsed = validateWithZod(userIdSchema, request.params, COMPONENT);
      if (!parsed.success) return parsed;
      return service.activate(parsed.value.id, request.user?.userId ?? null);
    }
  ),

  remove: handler(
    async (request: FastifyRequest) => {
      const parsed = validateWithZod(userIdSchema, request.params, COMPONENT);
      if (!parsed.success) return parsed;

      const result = await service.deactivate(
        parsed.value.id,
        request.user?.userId ?? null
      );
      if (!result.success) return result;
      return Ok({ message: 'Utilizador desactivado com sucesso' });
    }
  ),
});
