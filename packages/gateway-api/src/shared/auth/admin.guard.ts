import { ErrorFactory } from '@instantpay/utils';
import type { preHandlerHookHandler } from 'fastify';
import { sendAppError } from '../http/send-app-error.js';
import { safeEqual } from './api-key.js';

const COMPONENT = 'AdminGuard';

export const createAdminGuard = (
  expectedToken: string
): preHandlerHookHandler => async (request, reply) => {
  const header = request.headers['x-admin-token'];
  const token = Array.isArray(header) ? header[0] : header;

  if (!token || !safeEqual(token, expectedToken)) {
    sendAppError(
      reply,
      ErrorFactory.unauthorized(
        'Token administrativo inválido',
        'invalid_token',
        COMPONENT
      )
    );
  }
};
