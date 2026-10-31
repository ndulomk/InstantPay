import { z } from 'zod';

export const KYC_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export type UserResponseDTO = {
  id: string;
  username: string;
  email: string;
  phone: string;
  biNumber: string;
  nif: string;
  fullName: string;
  dateOfBirth: Date;
  kycStatus: KycStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UserWithPasswordDTO = UserResponseDTO & {
  password: string;
};

export type CreateUserDTO = {
  username: string;
  email: string;
  phone: string;
  password: string;
  biNumber: string;
  nif: string;
  fullName: string;
  dateOfBirth: Date;
  kycStatus?: KycStatus;
};

export type UpdateUserDTO = {
  username?: string;
  email?: string;
  phone?: string;
  password?: string;
  biNumber?: string;
  nif?: string;
  fullName?: string;
  dateOfBirth?: Date;
  kycStatus?: KycStatus;
};

export type ListUsersQueryDTO = {
  cursor?: string | null;
  pageSize?: number;
  search?: string;
  kycStatus?: KycStatus;
  isActive?: boolean;
};

/**
 * Política de password forte, alinhada com o resto da plataforma.
 */
const strongPassword = z
  .string()
  .min(8, 'Password deve ter pelo menos 8 caracteres')
  .regex(/[A-Z]/, 'Password deve ter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'Password deve ter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'Password deve ter pelo menos um número')
  .regex(/[^A-Za-z0-9]/, 'Password deve ter pelo menos um carácter especial');

const username = z.string().min(2, 'Username inválido').max(100);
const email = z.email('Email inválido').max(255);
const phone = z.string().min(7, 'Telefone inválido').max(20);
const biNumber = z.string().min(3, 'Número de BI inválido').max(100);
const nif = z.string().min(3, 'NIF inválido').max(100);
const fullName = z.string().min(3, 'Nome completo inválido').max(150);
const dateOfBirth = z.coerce
  .date()
  .min(new Date(1900, 0, 1), 'Data de nascimento inválida')
  .max(new Date(), 'Data de nascimento não pode estar no futuro');

export const createUserSchema = z.object({
  username,
  email,
  phone,
  password: strongPassword,
  biNumber,
  nif,
  fullName,
  dateOfBirth,
  kycStatus: z.enum(KYC_STATUSES).default('PENDING'),
});

export const updateUserSchema = z
  .object({
    username: username.optional(),
    email: email.optional(),
    phone: phone.optional(),
    password: strongPassword.optional(),
    biNumber: biNumber.optional(),
    nif: nif.optional(),
    fullName: fullName.optional(),
    dateOfBirth: dateOfBirth.optional(),
    kycStatus: z.enum(KYC_STATUSES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser fornecido para atualização',
  });

export const listUsersQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  kycStatus: z.enum(KYC_STATUSES).optional(),
  isActive: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional(),
});

export const userIdSchema = z.object({
  id: z.uuid('ID inválido'),
});
