import { z } from 'zod';

export const TRANSACTION_TYPES = [
  'TRANSFER',
  'DEPOSIT',
  'WITHDRAWAL',
  'PAYMENT',
  'REFUND',
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'reversed',
] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export type TransactionResponseDTO = {
  id: string;
  fromAccountId: string | null;
  toAccountId: string | null;
  amount: number;
  fee: number;
  currencyCode: string;
  transactionType: TransactionType;
  status: TransactionStatus;
  reference: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  initiatedAt: Date;
  processedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTransactionDTO = {
  fromAccountId?: string | null;
  toAccountId?: string | null;
  amount: number;
  fee: number;
  currencyCode: string;
  transactionType: TransactionType;
  status: TransactionStatus;
  reference: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  processedAt?: Date | null;
  completedAt?: Date | null;
};

export type TransferDTO = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  fee?: number;
  description?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
};

export type DepositDTO = {
  toAccountId: string;
  amount: number;
  description?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
};

export type WithdrawalDTO = {
  fromAccountId: string;
  amount: number;
  fee?: number;
  description?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
};

export type ListTransactionsQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  accountId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  reference?: string;
  from?: Date;
  to?: Date;
};

const amountSchema = z.coerce
  .number()
  .positive('O valor deve ser positivo')
  .finite()
  .max(1_000_000_000_000);

const feeSchema = z.coerce.number().min(0).finite().max(1_000_000_000).default(0);

const descriptionSchema = z.string().trim().max(255).optional();
const referenceSchema = z.string().trim().min(3).max(100).optional();
const metadataSchema = z.record(z.string(), z.unknown()).optional();

export const transferSchema = z
  .object({
    fromAccountId: z.uuid('fromAccountId inválido'),
    toAccountId: z.uuid('toAccountId inválido'),
    amount: amountSchema,
    fee: feeSchema.optional(),
    description: descriptionSchema,
    reference: referenceSchema,
    metadata: metadataSchema,
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: 'As contas de origem e destino devem ser diferentes',
    path: ['toAccountId'],
  });

export const depositSchema = z.object({
  toAccountId: z.uuid('toAccountId inválido'),
  amount: amountSchema,
  description: descriptionSchema,
  reference: referenceSchema,
  metadata: metadataSchema,
});

export const withdrawalSchema = z.object({
  fromAccountId: z.uuid('fromAccountId inválido'),
  amount: amountSchema,
  fee: feeSchema.optional(),
  description: descriptionSchema,
  reference: referenceSchema,
  metadata: metadataSchema,
});

export const listTransactionsQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  accountId: z.uuid().optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  status: z.enum(TRANSACTION_STATUSES).optional(),
  reference: z.string().trim().max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const transactionIdSchema = z.object({
  id: z.uuid('ID inválido'),
});
