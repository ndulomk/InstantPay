import type { Database } from '@instantpay/config';
import type { IRateLimitRepository } from '../../application/ports/rate-limit.port.js';

export const createRateLimitRepository = (
  db: Database
): IRateLimitRepository => ({
  async recordHit(apiKeyId: string, windowStart: Date): Promise<number> {
    const result = await db.query<{ request_count: number }>(
      `INSERT INTO gateway_rate_limit_windows
        (api_key_id, window_start, request_count)
       VALUES ($1::uuid, $2::timestamptz, 1)
       ON CONFLICT (api_key_id, window_start) DO UPDATE SET
         request_count = gateway_rate_limit_windows.request_count + 1
       RETURNING request_count`,
      [apiKeyId, windowStart]
    );
    return result.rows[0]?.request_count ?? 0;
  },

  async getCurrent(apiKeyId: string, windowStart: Date): Promise<number> {
    const result = await db.query<{ request_count: number }>(
      `SELECT request_count
       FROM gateway_rate_limit_windows
       WHERE api_key_id = $1::uuid AND window_start = $2::timestamptz
       LIMIT 1`,
      [apiKeyId, windowStart]
    );
    return result.rows[0]?.request_count ?? 0;
  },

  async cleanup(apiKeyId: string, before: Date): Promise<void> {
    await db.query(
      `DELETE FROM gateway_rate_limit_windows
       WHERE api_key_id = $1::uuid AND window_start < $2::timestamptz`,
      [apiKeyId, before]
    );
  },
});
