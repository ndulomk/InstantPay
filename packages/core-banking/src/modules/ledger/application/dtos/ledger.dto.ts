import { z } from 'zod';

export const LEDGER_ENTRY_TYPES = ['DEBIT', 'CREDIT'] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export type LedgerEntryResponseDTO = {
  id: string;
  accountId: string;
  transactionId: string | null;
  amount: number;
  balanceAfter: number;
  entryType: LedgerEntryType;
  description: string | null;
  createdAt: Date;
};

export type CreateLedgerEntryDTO = {
  accountId: string;
  transactionId?: string | null;
  amount: number;
  balanceAfter: number;
  entryType: LedgerEntryType;
  description?: string | null;
};

export type ListLedgerQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  accountId?: string;
  transactionId?: string;
  entryType?: LedgerEntryType;
  from?: Date;
  to?: Date;
};

export const listLedgerQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  accountId: z.uuid().optional(),
  transactionId: z.uuid().optional(),
  entryType: z.enum(LEDGER_ENTRY_TYPES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const ledgerAccountParamSchema = z.object({
  accountId: z.uuid('accountId inválido'),
});

export const ledgerTransactionParamSchema = z.object({
  transactionId: z.uuid('transactionId inválido'),
});
