import { z } from 'zod';
import type { UserResponseDTO } from '../../../users/application/dtos/user.dto.js';
import { createUserSchema } from '../../../users/application/dtos/user.dto.js';

export type RegisterDTO = {
  username: string;
  email: string;
  phone: string;
  password: string;
  biNumber: string;
  nif: string;
  fullName: string;
  dateOfBirth: Date;
};

export type LoginDTO = {
  email: string;
  password: string;
};

export type AuthResponseDTO = {
  user: UserResponseDTO;
  accessToken: string;
  refreshToken: string;
};

export type RefreshSessionResponseDTO = {
  accessToken: string;
  refreshToken: string;
};

export const registerSchema = createUserSchema.omit({ kycStatus: true });

export const loginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'Password obrigatória'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token obrigatório'),
});
