import { z } from 'zod';

export const RECONCILIATION_SOURCES = [
  'core_banking',
  'payment_processor',
  'manual',
] as const;
export type ReconciliationSource =
  (typeof RECONCILIATION_SOURCES)[number];

export const STATEMENT_STATUSES = [
  'draft',
  'running',
  'completed',
  'failed',
] as const;
export type StatementStatus = (typeof STATEMENT_STATUSES)[number];

export const RECONCILIATION_DIRECTIONS = ['credit', 'debit'] as const;
export type ReconciliationDirection =
  (typeof RECONCILIATION_DIRECTIONS)[number];

export const ENTRY_STATUSES = [
  'unmatched',
  'matched',
  'discrepancy',
  'ignored',
] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export type StatementResponseDTO = {
  id: string;
  reference: string;
  source: ReconciliationSource;
  accountReference: string;
  currencyCode: string;
  periodStart: Date;
  periodEnd: Date;
  openingBalance: number | null;
  closingBalance: number | null;
  status: StatementStatus;
  entriesCount: number;
  matchedCount: number;
  unmatchedCount: number;
  discrepancyCount: number;
  matchedAmount: number;
  unmatchedAmount: number;
  metadata: Record<string, unknown> | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EntryResponseDTO = {
  id: string;
  statementId: string;
  externalReference: string;
  direction: ReconciliationDirection;
  amount: number;
  currencyCode: string;
  valueDate: Date;
  description: string | null;
  status: EntryStatus;
  matchedInternalId: string | null;
  discrepancyType: string | null;
  matchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateStatementDTO = {
  reference: string;
  source: ReconciliationSource;
  accountReference: string;
  currencyCode: string;
  periodStart: Date;
  periodEnd: Date;
  openingBalance?: number;
  closingBalance?: number;
  metadata?: Record<string, unknown>;
};

export type StatementListFilters = {
  source?: ReconciliationSource;
  status?: StatementStatus;
  accountReference?: string;
  from?: Date;
  to?: Date;
};

export type CreateEntryDTO = {
  externalReference: string;
  direction: ReconciliationDirection;
  amount: number;
  currencyCode?: string;
  valueDate: Date;
  description?: string;
};

export type EntryListFilters = {
  status?: EntryStatus;
  direction?: ReconciliationDirection;
  externalReference?: string;
};

const referenceSchema = z.string().trim().min(2).max(120);

const currencySchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());

const amountSchema = z.coerce
  .number()
  .positive('O valor deve ser positivo')
  .finite()
  .max(1_000_000_000_000)
  .transform((value) => Math.round(value * 100) / 100);

const metadataSchema = z.record(z.string(), z.unknown());

export const createStatementSchema = z
  .object({
    reference: referenceSchema,
    source: z.enum(RECONCILIATION_SOURCES),
    accountReference: z.string().trim().min(1).max(120),
    currencyCode: currencySchema,
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    openingBalance: z.coerce.number().finite().optional(),
    closingBalance: z.coerce.number().finite().optional(),
    metadata: metadataSchema.optional(),
  })
  .refine((value) => value.periodEnd >= value.periodStart, {
    path: ['periodEnd'],
    message: 'O fim do período deve ser posterior ao início',
  });

export const listStatementsQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  source: z.enum(RECONCILIATION_SOURCES).optional(),
  status: z.enum(STATEMENT_STATUSES).optional(),
  accountReference: z.string().trim().max(120).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const statementIdSchema = z.object({
  id: z.uuid('ID inválido'),
});

export const entryParamsSchema = z.object({
  id: z.uuid('ID inválido'),
  entryId: z.uuid('ID inválido'),
});

export const entryStatusSchema = z.object({
  status: z.enum(['unmatched', 'ignored']),
});

const entrySchema = z.object({
  externalReference: referenceSchema,
  direction: z.enum(RECONCILIATION_DIRECTIONS),
  amount: amountSchema,
  currencyCode: currencySchema.optional(),
  valueDate: z.coerce.date(),
  description: z.string().trim().max(255).optional(),
});

export const createEntriesSchema = z.union([
  entrySchema.transform((entry) => ({ entries: [entry] })),
  z.object({
    entries: z.array(entrySchema).min(1).max(1000),
  }),
]);

export const listEntriesQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ENTRY_STATUSES).optional(),
  direction: z.enum(RECONCILIATION_DIRECTIONS).optional(),
  externalReference: z.string().trim().max(120).optional(),
});
