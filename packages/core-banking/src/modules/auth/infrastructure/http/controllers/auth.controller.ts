import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IAuthService } from '../../../application/ports/auth.port.js';
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from '../../../application/dtos/auth.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'AuthController';

const requestContext = (request: FastifyRequest): {
  userAgent?: string;
  ipAddress?: string;
} => {
  const forwarded = request.headers['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return {
    userAgent: request.headers['user-agent'],
    ipAddress: forwardedValue?.split(',')[0]?.trim() ?? request.ip,
  };
};

export const createAuthController = (service: IAuthService) => ({
  register: handler(
    async (request: FastifyRequest, reply) => {
      const parsed = validateWithZod(registerSchema, request.body, COMPONENT);
      if (!parsed.success) return parsed;

      const ctx = requestContext(request);
      const result = await service.register(
        parsed.value,
        ctx.userAgent,
        ctx.ipAddress
      );
      if (result.success) reply.code(201);
      return result;
    }
  ),

  login: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(loginSchema, request.body, COMPONENT);
    if (!parsed.success) return parsed;

    const ctx = requestContext(request);
    return service.login(parsed.value, ctx.userAgent, ctx.ipAddress);
  }),

  refresh: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      refreshTokenSchema,
      request.body,
      COMPONENT
    );
    if (!parsed.success) return parsed;
    return service.refreshToken(parsed.value.refreshToken);
  }),

  logout: handler(async (request: FastifyRequest) => {
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : '';
    if (token) {
      await service.logout(token);
    }
    return {
      success: true as const,
      value: { message: 'Sessão terminada' },
    };
  }),

  me: handler(async (request: FastifyRequest) => {
    const userId = request.user?.userId;
    if (!userId) {
      return {
        success: false as const,
        error: {
          type: 'UNAUTHORIZED' as const,
          statusCode: 401,
          message: 'Não autenticado',
          timestamp: new Date().toISOString(),
        },
      };
    }
    return service.me(userId);
  }),
});
