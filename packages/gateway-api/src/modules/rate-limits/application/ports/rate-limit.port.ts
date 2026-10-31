import type { AppError, Result } from '@instantpay/utils';
import type { RateLimitStateDTO } from '../dtos/rate-limit.dto.js';

export interface IRateLimitRepository {
  recordHit(apiKeyId: string, windowStart: Date): Promise<number>;
  getCurrent(apiKeyId: string, windowStart: Date): Promise<number>;
  cleanup(apiKeyId: string, before: Date): Promise<void>;
}

export interface IRateLimitService {
  consume(
    apiKeyId: string,
    limit: number
  ): Promise<Result<RateLimitStateDTO, AppError>>;
  getCurrent(
    apiKeyId: string,
    limit: number
  ): Promise<Result<RateLimitStateDTO, AppError>>;
}
