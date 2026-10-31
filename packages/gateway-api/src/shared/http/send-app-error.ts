import { buildErrorPayload } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type { FastifyReply } from 'fastify';

/**
 * Responde com o formato de erro padrão sem passar pelo wrapper `handler`.
 * Usado por guards e pelo proxy, que precisam de controlar o status HTTP.
 */
export const sendAppError = (
  reply: FastifyReply,
  error: AppError
): FastifyReply => {
  if (error.type === 'TOO_MANY_REQUESTS' && error.retryAfterSeconds) {
    reply.header('retry-after', String(error.retryAfterSeconds));
  }

  return reply.status(error.statusCode).send({
    status: 'error',
    error: buildErrorPayload(error),
  });
};
