import type { Result } from '@instantpay/utils';
import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  ISessionRepository,
  ISessionService,
} from '../ports/auth.port.js';
import type { RefreshSessionResponseDTO } from '../dtos/auth.dto.js';
import {
  accessTokenTtlSeconds,
  refreshTokenTtlSeconds,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../../../shared/auth/tokens.js';

const COMPONENT = 'SessionService';

export const createSessionService = (
  repository: ISessionRepository
): ISessionService => {
  const createSession = async (
    userId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<Result<RefreshSessionResponseDTO, AppError>> => {
    const accessToken = signAccessToken(userId);
    const refreshToken = signRefreshToken(userId);

    await repository.create({
      userId,
      token: accessToken,
      refreshToken,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
      expiresAt: new Date(Date.now() + refreshTokenTtlSeconds * 1000),
    });

    return Ok({ accessToken, refreshToken });
  };

  return {
    createSession,

    async refreshSession(
      refreshToken: string
    ): Promise<Result<RefreshSessionResponseDTO, AppError>> {
      const payload = verifyRefreshToken(refreshToken);
      if (!payload) {
        return Err(
          ErrorFactory.unauthorized(
            'Refresh token inválido ou expirado',
            'invalid_token',
            COMPONENT
          )
        );
      }

      const session = await repository.findByRefreshToken(refreshToken);
      if (
        !session ||
        !session.isActive ||
        session.expiresAt.getTime() <= Date.now()
      ) {
        return Err(
          ErrorFactory.unauthorized(
            'Sessão inválida ou expirada',
            'expired_token',
            COMPONENT
          )
        );
      }

      await repository.revoke(session.id);

      return createSession(
        payload.userId,
        session.userAgent ?? undefined,
        session.ipAddress ?? undefined
      );
    },

    async revokeSession(token: string): Promise<Result<void, AppError>> {
      await repository.revokeByToken(token);
      return Ok(undefined);
    },

    async revokeAllUserSessions(
      userId: string
    ): Promise<Result<void, AppError>> {
      await repository.revokeAllByUser(userId);
      return Ok(undefined);
    },
  };
};

export const sessionTtls = {
  accessSeconds: accessTokenTtlSeconds,
  refreshSeconds: refreshTokenTtlSeconds,
};
