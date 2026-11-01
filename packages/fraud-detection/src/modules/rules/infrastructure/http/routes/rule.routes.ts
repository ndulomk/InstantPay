import type { FastifyPluginAsync } from 'fastify';
import type { IRuleService } from '../../../application/ports/rule.port.js';
import { createRuleController } from '../controllers/rule.controller.js';

export type RuleRoutesOptions = {
  service: IRuleService;
};

export const ruleRoutes: FastifyPluginAsync<RuleRoutesOptions> = async (
  fastify,
  { service }
) => {
  const controller = createRuleController(service);

  fastify.post('/fraud/rules', controller.create);
  fastify.get('/fraud/rules', controller.list);
  fastify.get('/fraud/rules/:id', controller.getById);
  fastify.patch('/fraud/rules/:id', controller.update);
  fastify.patch('/fraud/rules/:id/status', controller.setActive);
};
