import { ErrorFactory } from '@instantpay/utils';
import type { preHandlerHookHandler } from 'fastify';
import type { IApiKeyService } from '../../modules/api-keys/application/ports/api-key.port.js';
import type { IRateLimitService } from '../../modules/rate-limits/application/ports/rate-limit.port.js';
import type { ApiKeyScope } from '../../modules/api-keys/application/dtos/api-key.dto.js';
import { sendAppError } from '../http/send-app-error.js';

const COMPONENT = 'ApiKeyGuard';

const requiredScope = (method: string): ApiKeyScope =>
  method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
    ? 'read'
    : 'write';

export const createApiKeyGuard = (
  apiKeys: IApiKeyService,
  rateLimits: IRateLimitService
): preHandlerHookHandler => async (request, reply) => {
  const header = request.headers['x-api-key'];
  const rawKey = Array.isArray(header) ? header[0] : header;

  const authentication = await apiKeys.authenticate(rawKey);
  if (!authentication.success) {
    sendAppError(reply, authentication.error);
    return;
  }

  const apiKey = authentication.value;
  const scope = requiredScope(request.method);
  const allowed =
    apiKey.scopes.includes('admin') || apiKey.scopes.includes(scope);

  if (!allowed) {
    sendAppError(
      reply,
      ErrorFactory.forbidden(
        `A API key não tem o scope '${scope}'`,
        scope,
        COMPONENT
      )
    );
    return;
  }

  const rateLimit = await rateLimits.consume(
    apiKey.id,
    apiKey.rateLimitPerMinute
  );
  if (!rateLimit.success) {
    sendAppError(reply, rateLimit.error);
    return;
  }

  const state = rateLimit.value;
  reply.header('x-ratelimit-limit', String(state.limit));
  reply.header('x-ratelimit-remaining', String(state.remaining));
  reply.header(
    'x-ratelimit-reset',
    String(Math.floor(state.resetAt.getTime() / 1_000))
  );

  request.apiKey = apiKey;
};
