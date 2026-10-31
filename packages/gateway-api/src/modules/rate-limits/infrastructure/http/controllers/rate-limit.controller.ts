import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IRateLimitService } from '../../../application/ports/rate-limit.port.js';

const COMPONENT = 'RateLimitController';

export const createRateLimitController = (service: IRateLimitService) => ({
  usage: handler(async (request: FastifyRequest) => {
    const apiKey = request.apiKey;
    if (!apiKey) {
      return {
        success: false as const,
        error: {
          type: 'UNAUTHORIZED' as const,
          statusCode: 401,
          message: 'Não autenticado',
          timestamp: new Date().toISOString(),
          component: COMPONENT,
        },
      };
    }

    return service.getCurrent(apiKey.id, apiKey.rateLimitPerMinute);
  }),
});
