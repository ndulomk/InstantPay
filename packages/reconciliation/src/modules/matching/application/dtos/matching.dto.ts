import { z } from 'zod';
import type { StatementResponseDTO } from '../../../statements/application/dtos/statement.dto.js';

export const MATCH_TYPES = [
  'reference',
  'amount_date',
  'amount_window',
] as const;
export type MatchType = (typeof MATCH_TYPES)[number];

export const DISCREPANCY_TYPES = [
  'missing_internal',
  'missing_external',
  'amount_mismatch',
  'duplicate',
  'balance_mismatch',
] as const;
export type DiscrepancyType = (typeof DISCREPANCY_TYPES)[number];

export const DISCREPANCY_STATUSES = [
  'open',
  'resolved',
  'ignored',
] as const;
export type DiscrepancyStatus =
  (typeof DISCREPANCY_STATUSES)[number];

export type MatchResponseDTO = {
  id: string;
  statementId: string;
  entryId: string;
  internalRecordId: string;
  amount: number;
  matchType: MatchType;
  matchedAt: Date;
  createdAt: Date;
};

export type DiscrepancyResponseDTO = {
  id: string;
  statementId: string;
  entryId: string | null;
  internalRecordId: string | null;
  type: DiscrepancyType;
  expectedAmount: number | null;
  actualAmount: number | null;
  difference: number | null;
  description: string;
  status: DiscrepancyStatus;
  resolutionNotes: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateMatchRecordDTO = {
  statementId: string;
  entryId: string;
  internalRecordId: string;
  amount: number;
  matchType: MatchType;
};

export type CreateDiscrepancyRecordDTO = {
  statementId: string;
  entryId?: string | null;
  internalRecordId?: string | null;
  type: DiscrepancyType;
  expectedAmount?: number | null;
  actualAmount?: number | null;
  difference?: number | null;
  description: string;
};

export type DiscrepancyListFilters = {
  statementId?: string;
  status?: DiscrepancyStatus;
  type?: DiscrepancyType;
};

export type UpdateDiscrepancyDTO = {
  status: Exclude<DiscrepancyStatus, 'open'>;
  resolutionNotes?: string;
};

export type RunReconciliationResultDTO = {
  statement: StatementResponseDTO;
  matches: number;
  discrepancies: number;
};

export const listMatchesQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const listDiscrepanciesQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  statementId: z.uuid('ID inválido').optional(),
  status: z.enum(DISCREPANCY_STATUSES).optional(),
  type: z.enum(DISCREPANCY_TYPES).optional(),
});

export const discrepancyIdSchema = z.object({
  id: z.uuid('ID inválido'),
});

export const updateDiscrepancySchema = z.object({
  status: z.enum(['resolved', 'ignored']),
  resolutionNotes: z.string().trim().max(1000).optional(),
});
