import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type {
  IRateLimitRepository,
  IRateLimitService,
} from '../ports/rate-limit.port.js';
import type { RateLimitStateDTO } from '../dtos/rate-limit.dto.js';

const COMPONENT = 'RateLimitService';
const WINDOW_MS = 60_000;
const RETENTION_MS = 24 * 60 * 60 * 1_000;

const startOfWindow = (date: Date): Date => {
  const value = new Date(date);
  value.setSeconds(0, 0);
  return value;
};

const buildState = (
  limit: number,
  used: number,
  windowStart: Date
): RateLimitStateDTO => ({
  limit,
  used,
  remaining: Math.max(0, limit - used),
  windowStart,
  resetAt: new Date(windowStart.getTime() + WINDOW_MS),
});

const retryAfter = (resetAt: Date): number =>
  Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1_000));

export const createRateLimitService = (
  repository: IRateLimitRepository
): IRateLimitService => ({
  async consume(
    apiKeyId: string,
    limit: number
  ): Promise<Result<RateLimitStateDTO, AppError>> {
    if (!Number.isInteger(limit) || limit < 1) {
      return Err(
        ErrorFactory.business(
          'Limite de pedidos inválido',
          'invalid_rate_limit',
          COMPONENT
        )
      );
    }

    const windowStart = startOfWindow(new Date());
    const used = await repository.recordHit(apiKeyId, windowStart);

    if (used === 1) {
      const before = new Date(Date.now() - RETENTION_MS);
      void repository.cleanup(apiKeyId, before).catch((error: unknown) => {
        console.error('[rate-limit] falha na limpeza de janelas antigas', error);
      });
    }

    const state = buildState(limit, used, windowStart);

    if (used > limit) {
      return Err(
        ErrorFactory.tooManyRequests(
          'Limite de pedidos por minuto excedido',
          retryAfter(state.resetAt),
          limit,
          COMPONENT
        )
      );
    }

    return Ok(state);
  },

  async getCurrent(
    apiKeyId: string,
    limit: number
  ): Promise<Result<RateLimitStateDTO, AppError>> {
    const windowStart = startOfWindow(new Date());
    const used = await repository.getCurrent(apiKeyId, windowStart);
    return Ok(buildState(limit, used, windowStart));
  },
});
