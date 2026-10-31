import { z } from 'zod';

export type RequestLogResponseDTO = {
  id: string;
  apiKeyId: string | null;
  method: string;
  path: string;
  upstream: string;
  statusCode: number;
  durationMs: number;
  ipAddress: string | null;
  userAgent: string | null;
  errorCode: string | null;
  createdAt: Date;
};

export type CreateRequestLogDTO = {
  apiKeyId?: string | null;
  method: string;
  path: string;
  upstream: string;
  statusCode: number;
  durationMs: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  errorCode?: string | null;
};

export type ListRequestLogsQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  apiKeyId?: string;
  statusCode?: number;
  upstream?: string;
  from?: Date;
  to?: Date;
};

export const listRequestLogsQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  apiKeyId: z.uuid().optional(),
  statusCode: z.coerce.number().int().min(100).max(599).optional(),
  upstream: z.string().trim().max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
