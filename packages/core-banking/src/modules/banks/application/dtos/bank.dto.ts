import { z } from 'zod';

export type BankResponseDTO = {
  id: string;
  bankName: string;
  bankCode: string;
  swiftCode: string | null;
  status: boolean;
  reservePercentage: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateBankDTO = {
  bankName: string;
  bankCode: string;
  swiftCode?: string;
  status?: boolean;
  reservePercentage: number;
};

export type UpdateBankDTO = {
  bankName?: string;
  bankCode?: string;
  swiftCode?: string;
  status?: boolean;
  reservePercentage?: number;
};

export type ListBanksQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  search?: string;
  status?: boolean;
};

export const createBankSchema = z.object({
  bankName: z.string().trim().min(2).max(255),
  bankCode: z.string().trim().min(1).max(20),
  swiftCode: z.string().trim().min(2).max(20).optional(),
  status: z.boolean().default(false),
  reservePercentage: z.coerce.number().min(0).max(1),
});

export const updateBankSchema = z
  .object({
    bankName: z.string().trim().min(2).max(255).optional(),
    bankCode: z.string().trim().min(1).max(20).optional(),
    swiftCode: z.string().trim().min(2).max(20).optional(),
    status: z.boolean().optional(),
    reservePercentage: z.coerce.number().min(0).max(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser fornecido para atualização',
  });

export const listBanksQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional(),
});

export const bankIdSchema = z.object({
  id: z.uuid('ID inválido'),
});
