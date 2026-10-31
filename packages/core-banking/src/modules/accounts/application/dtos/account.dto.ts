import { z } from 'zod';

export const ACCOUNT_TYPES = [
  'CORRENTE',
  'POUPANCA',
  'PRAZO',
  'EMPRESARIAL',
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_STATUSES = [
  'active',
  'blocked',
  'frozen',
  'closed',
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export type AccountResponseDTO = {
  id: string;
  userId: string;
  bankId: string;
  accountNumber: string;
  accountType: AccountType;
  balance: number;
  availableBalance: number;
  blockedAmount: number;
  currencyCode: string;
  status: AccountStatus;
  lastTransactionDate: Date | null;
  openedAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAccountDTO = {
  userId: string;
  bankId: string;
  accountType: AccountType;
  currencyCode?: string;
};

export type UpdateAccountStatusDTO = {
  status: AccountStatus;
};

export type ListAccountsQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  userId?: string;
  bankId?: string;
  status?: AccountStatus;
  accountType?: AccountType;
};

export const createAccountSchema = z.object({
  userId: z.uuid('userId inválido'),
  bankId: z.uuid('bankId inválido'),
  accountType: z.enum(ACCOUNT_TYPES),
  currencyCode: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .default('AOA'),
});

export const updateAccountStatusSchema = z.object({
  status: z.enum(ACCOUNT_STATUSES),
});

export const listAccountsQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.uuid().optional(),
  bankId: z.uuid().optional(),
  status: z.enum(ACCOUNT_STATUSES).optional(),
  accountType: z.enum(ACCOUNT_TYPES).optional(),
});

export const accountIdSchema = z.object({
  id: z.uuid('ID inválido'),
});

export const accountNumberSchema = z.object({
  accountNumber: z.string().trim().min(3).max(40),
});
