export type RateLimitStateDTO = {
  limit: number;
  used: number;
  remaining: number;
  windowStart: Date;
  resetAt: Date;
};
