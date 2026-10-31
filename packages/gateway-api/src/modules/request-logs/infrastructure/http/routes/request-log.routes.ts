import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';
import type { IRequestLogService } from '../../../application/ports/request-log.port.js';
import { createRequestLogController } from '../controllers/request-log.controller.js';

export type RequestLogRoutesOptions = {
  service: IRequestLogService;
  adminGuard: preHandlerHookHandler;
};

export const requestLogRoutes: FastifyPluginAsync<
  RequestLogRoutesOptions
> = async (fastify, { service, adminGuard }) => {
  const controller = createRequestLogController(service);

  fastify.get(
    '/gateway/request-logs',
    { preHandler: adminGuard },
    controller.list
  );
};
