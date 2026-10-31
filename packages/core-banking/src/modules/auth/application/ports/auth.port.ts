import type { Result } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  AuthResponseDTO,
  LoginDTO,
  RefreshSessionResponseDTO,
  RegisterDTO,
} from '../dtos/auth.dto.js';
import type { UserResponseDTO } from '../../../users/application/dtos/user.dto.js';

export type CreateSessionRecord = {
  userId: string;
  token: string;
  refreshToken: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: Date;
};

export type SessionRecord = {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  userAgent: string | null;
  ipAddress: string | null;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
};

export interface ISessionRepository {
  create(data: CreateSessionRecord): Promise<SessionRecord>;
  findByToken(token: string): Promise<SessionRecord | null>;
  findByRefreshToken(refreshToken: string): Promise<SessionRecord | null>;
  revoke(sessionId: string): Promise<void>;
  revokeByToken(token: string): Promise<void>;
  revokeAllByUser(userId: string): Promise<void>;
}

export interface ISessionService {
  createSession(
    userId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<Result<RefreshSessionResponseDTO, AppError>>;
  refreshSession(
    refreshToken: string
  ): Promise<Result<RefreshSessionResponseDTO, AppError>>;
  revokeSession(token: string): Promise<Result<void, AppError>>;
  revokeAllUserSessions(userId: string): Promise<Result<void, AppError>>;
}

export interface IAuthService {
  register(
    data: RegisterDTO,
    userAgent?: string,
    ipAddress?: string
  ): Promise<Result<AuthResponseDTO, AppError>>;
  login(
    data: LoginDTO,
    userAgent?: string,
    ipAddress?: string
  ): Promise<Result<AuthResponseDTO, AppError>>;
  refreshToken(
    refreshToken: string
  ): Promise<Result<RefreshSessionResponseDTO, AppError>>;
  logout(token: string): Promise<Result<void, AppError>>;
  me(userId: string): Promise<Result<UserResponseDTO, AppError>>;
}
