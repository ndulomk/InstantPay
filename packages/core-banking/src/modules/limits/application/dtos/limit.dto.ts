import { z } from 'zod';

export const DEFAULT_DAILY_TRANSFER_LIMIT = 1_000_000;
export const DEFAULT_SINGLE_TRANSACTION_LIMIT = 500_000;
export const DEFAULT_MONTHLY_LIMIT = 5_000_000;

export type TransactionLimitResponseDTO = {
  id: string | null;
  accountId: string;
  dailyTransferLimit: number;
  singleTransactionLimit: number;
  monthlyLimit: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type UpsertTransactionLimitDTO = {
  dailyTransferLimit?: number;
  singleTransactionLimit?: number;
  monthlyLimit?: number;
};

export type ListLimitsQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  accountId?: string;
};

export const upsertTransactionLimitSchema = z
  .object({
    dailyTransferLimit: z.coerce.number().positive().optional(),
    singleTransactionLimit: z.coerce.number().positive().optional(),
    monthlyLimit: z.coerce.number().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um limite deve ser fornecido',
  });

export const listLimitsQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  accountId: z.uuid().optional(),
});

export const accountLimitParamSchema = z.object({
  accountId: z.uuid('accountId inválido'),
});
