import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';
import type { IAuditService } from '../../../application/ports/audit.port.js';
import { createAuditController } from '../controllers/audit.controller.js';

export type AuditRoutesOptions = {
  service: IAuditService;
  guard: preHandlerHookHandler;
};

export const auditRoutes: FastifyPluginAsync<AuditRoutesOptions> = async (
  fastify,
  { service, guard }
) => {
  const controller = createAuditController(service);

  fastify.get('/audit', { preHandler: guard }, controller.list);
};
