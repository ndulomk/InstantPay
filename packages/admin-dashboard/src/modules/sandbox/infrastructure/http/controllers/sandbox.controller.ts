import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import {
  sandboxGatewayRequestSchema,
  sandboxRequestSchema,
} from '../../../application/dtos/sandbox.dto.js';
import type { ISandboxService } from '../../../application/ports/sandbox.port.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'SandboxController';

export const createSandboxController = (service: ISandboxService) => ({
  createDemo: handler(async () => service.createDemo()),

  request: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      sandboxRequestSchema,
      request.body,
      COMPONENT
    );
    if (!parsed.success) return parsed;
    return service.request(parsed.value);
  }),

  gateway: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      sandboxGatewayRequestSchema,
      request.body,
      COMPONENT
    );
    if (!parsed.success) return parsed;
    return service.gateway(parsed.value);
  }),

  smoke: handler(async () => service.smoke()),
});
