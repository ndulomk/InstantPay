import type { FastifyPluginAsync } from 'fastify';
import type { ISandboxService } from '../../../application/ports/sandbox.port.js';
import { createSandboxController } from '../controllers/sandbox.controller.js';

export type SandboxRoutesOptions = {
  service: ISandboxService;
};

export const sandboxRoutes: FastifyPluginAsync<SandboxRoutesOptions> = async (
  fastify,
  { service }
) => {
  const controller = createSandboxController(service);

  fastify.post('/admin/sandbox/demo', controller.createDemo);
  fastify.post('/admin/sandbox/request', controller.request);
  fastify.post('/admin/sandbox/gateway', controller.gateway);
  fastify.post('/admin/sandbox/smoke', controller.smoke);
};
