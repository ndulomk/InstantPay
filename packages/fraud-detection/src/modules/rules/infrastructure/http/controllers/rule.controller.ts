import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IRuleService } from '../../../application/ports/rule.port.js';
import {
  createRuleSchema,
  listRulesQuerySchema,
  ruleActiveSchema,
  ruleIdSchema,
  updateRuleSchema,
} from '../../../application/dtos/rule.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'RuleController';

export const createRuleController = (service: IRuleService) => ({
  create: handler(async (request: FastifyRequest, reply) => {
    const parsed = validateWithZod(
      createRuleSchema,
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
      listRulesQuerySchema,
      request.query,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const { cursor, pageSize, ...filters } = parsed.value;
    return service.list({ cursor, pageSize }, filters);
  }),

  getById: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      ruleIdSchema,
      request.params,
      COMPONENT
    );
    if (!parsed.success) return parsed;
    return service.getById(parsed.value.id);
  }),

  update: handler(async (request: FastifyRequest) => {
    const params = validateWithZod(
      ruleIdSchema,
      request.params,
      COMPONENT
    );
    if (!params.success) return params;

    const body = validateWithZod(
      updateRuleSchema,
      request.body,
      COMPONENT
    );
    if (!body.success) return body;

    return service.update(params.value.id, body.value);
  }),

  setActive: handler(async (request: FastifyRequest) => {
    const params = validateWithZod(
      ruleIdSchema,
      request.params,
      COMPONENT
    );
    if (!params.success) return params;

    const body = validateWithZod(
      ruleActiveSchema,
      request.body,
      COMPONENT
    );
    if (!body.success) return body;

    return service.setActive(params.value.id, body.value.isActive);
  }),
});
