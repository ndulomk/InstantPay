import { z } from 'zod';

export type ReserveResponseDTO = {
  id: string;
  bankId: string;
  calculationDate: string;
  totalDeposits: number;
  requiredReserve: number;
  actualReserve: number;
  isCompliant: boolean;
  createdAt: Date;
};

export type CreateReserveDTO = {
  bankId: string;
  actualReserve: number;
  calculationDate?: Date;
};

export type ListReservesQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  bankId?: string;
  compliant?: boolean;
  from?: Date;
  to?: Date;
};

export const calculateReserveSchema = z.object({
  bankId: z.uuid('bankId inválido'),
  actualReserve: z.coerce.number().min(0).finite().max(1_000_000_000_000),
  calculationDate: z.coerce.date().optional(),
});

export const listReservesQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  bankId: z.uuid().optional(),
  compliant: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const reserveIdSchema = z.object({
  id: z.uuid('ID inválido'),
});

export const reserveBankParamSchema = z.object({
  bankId: z.uuid('bankId inválido'),
});
