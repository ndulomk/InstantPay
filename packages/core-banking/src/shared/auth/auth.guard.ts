import type { preHandlerHookHandler } from 'fastify';
import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@instantpay/utils';
import type { IUserRepository } from '../../modules/users/application/ports/user.port.js';
import type { ISessionRepository } from '../../modules/auth/application/ports/auth.port.js';
import { verifyAccessToken } from './tokens.js';

const extractBearerToken = (header?: string): string | null => {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
};

/**
 * Middleware de autenticação: valida o JWT, garante que a sessão continua
 * activa e que o utilizador existe e está activo.
 */
export const createAuthGuard = (
  users: IUserRepository,
  sessions: ISessionRepository
): preHandlerHookHandler => {
  return async (request) => {
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Token não fornecido', 'AuthGuard');
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      throw new UnauthorizedException(
        'Token inválido ou expirado',
        'AuthGuard'
      );
    }

    const session = await sessions.findByToken(token);
    if (
      !session ||
      !session.isActive ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Sessão inválida ou expirada', 'AuthGuard');
    }

    const user = await users.findById(payload.userId);
    if (!user) {
      throw new NotFoundException('Utilizador não encontrado', 'AuthGuard');
    }
    if (!user.isActive) {
      throw new ForbiddenException('Conta desactivada', 'AuthGuard');
    }

    request.user = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };
  };
};
