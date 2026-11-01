import { z } from 'zod';
import {
  RECONCILIATION_DIRECTIONS,
  RECONCILIATION_SOURCES,
  ENTRY_STATUSES,
} from '../../../statements/application/dtos/statement.dto.js';
import type {
  EntryStatus,
  ReconciliationDirection,
  ReconciliationSource,
} from '../../../statements/application/dtos/statement.dto.js';

export type InternalRecordResponseDTO = {
  id: string;
  source: ReconciliationSource;
  sourceReference: string;
  accountReference: string;
  direction: ReconciliationDirection;
  amount: number;
  currencyCode: string;
  valueDate: Date;
  description: string | null;
  status: EntryStatus;
  matchedEntryId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateInternalRecordDTO = {
  source: ReconciliationSource;
  sourceReference: string;
  accountReference: string;
  direction: ReconciliationDirection;
  amount: number;
  currencyCode: string;
  valueDate: Date;
  description?: string;
};

export type InternalRecordListFilters = {
  source?: ReconciliationSource;
  accountReference?: string;
  status?: EntryStatus;
  from?: Date;
  to?: Date;
};

export type CreateInternalRecordsResultDTO = {
  created: number;
  skipped: number;
  records: InternalRecordResponseDTO[];
};

const amountSchema = z.coerce
  .number()
  .positive('O valor deve ser positivo')
  .finite()
  .max(1_000_000_000_000)
  .transform((value) => Math.round(value * 100) / 100);

const recordSchema = z.object({
  source: z.enum(RECONCILIATION_SOURCES),
  sourceReference: z.string().trim().min(2).max(120),
  accountReference: z.string().trim().min(1).max(120),
  direction: z.enum(RECONCILIATION_DIRECTIONS),
  amount: amountSchema,
  currencyCode: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),
  valueDate: z.coerce.date(),
  description: z.string().trim().max(255).optional(),
});

export const createInternalRecordsSchema = z.union([
  recordSchema.transform((record) => ({ records: [record] })),
  z.object({
    records: z.array(recordSchema).min(1).max(1000),
  }),
]);

export const listInternalRecordsQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  source: z.enum(RECONCILIATION_SOURCES).optional(),
  accountReference: z.string().trim().max(120).optional(),
  status: z.enum(ENTRY_STATUSES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const internalRecordIdSchema = z.object({
  id: z.uuid('ID inválido'),
});
