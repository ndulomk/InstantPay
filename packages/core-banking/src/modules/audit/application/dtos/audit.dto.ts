import { z } from 'zod';

export type AuditOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export type AuditLogResponseDTO = {
  id: string;
  tableName: string;
  recordId: string;
  operation: AuditOperation;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};

export type CreateAuditLogDTO = {
  tableName: string;
  recordId: string;
  operation: AuditOperation;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type ListAuditQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  tableName?: string;
  recordId?: string;
  operation?: AuditOperation;
  userId?: string;
  from?: Date;
  to?: Date;
};

export const listAuditQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  tableName: z.string().min(1).max(50).optional(),
  recordId: z.uuid().optional(),
  operation: z.enum(['INSERT', 'UPDATE', 'DELETE']).optional(),
  userId: z.uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
