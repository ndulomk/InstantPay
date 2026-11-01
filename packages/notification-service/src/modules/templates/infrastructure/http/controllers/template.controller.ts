import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { ITemplateService } from '../../../application/ports/template.port.js';
import {
  createTemplateSchema,
  listTemplatesQuerySchema,
  templateActiveSchema,
  templateIdSchema,
  updateTemplateSchema,
} from '../../../application/dtos/template.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'TemplateController';

export const createTemplateController = (service: ITemplateService) => ({
  create: handler(async (request: FastifyRequest, reply) => {
    const parsed = validateWithZod(
      createTemplateSchema,
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
      listTemplatesQuerySchema,
      request.query,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const { cursor, pageSize, ...filters } = parsed.value;
    return service.list({ cursor, pageSize }, filters);
  }),

  getById: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      templateIdSchema,
      request.params,
      COMPONENT
    );
    if (!parsed.success) return parsed;
    return service.getById(parsed.value.id);
  }),

  update: handler(async (request: FastifyRequest) => {
    const params = validateWithZod(
      templateIdSchema,
      request.params,
      COMPONENT
    );
    if (!params.success) return params;

    const body = validateWithZod(
      updateTemplateSchema,
      request.body,
      COMPONENT
    );
    if (!body.success) return body;

    return service.update(params.value.id, body.value);
  }),

  setActive: handler(async (request: FastifyRequest) => {
    const params = validateWithZod(
      templateIdSchema,
      request.params,
      COMPONENT
    );
    if (!params.success) return params;

    const body = validateWithZod(
      templateActiveSchema,
      request.body,
      COMPONENT
    );
    if (!body.success) return body;

    return service.setActive(params.value.id, body.value.isActive);
  }),
});
