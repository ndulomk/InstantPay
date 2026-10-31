import type { Result } from '@instantpay/utils';
import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  IAuthService,
  ISessionService,
} from '../ports/auth.port.js';
import type {
  AuthResponseDTO,
  LoginDTO,
  RefreshSessionResponseDTO,
  RegisterDTO,
} from '../dtos/auth.dto.js';
import type { IUserRepository } from '../../../users/application/ports/user.port.js';
import type { IUserService } from '../../../users/application/ports/user.port.js';
import type { UserResponseDTO } from '../../../users/application/dtos/user.dto.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { comparePassword } from '../../../../shared/auth/password.js';

const COMPONENT = 'AuthService';

export const createAuthService = (
  userRepository: IUserRepository,
  userService: IUserService,
  sessionService: ISessionService,
  eventBus: EventBus
): IAuthService => ({
  async register(
    data: RegisterDTO,
    userAgent?: string,
    ipAddress?: string
  ): Promise<Result<AuthResponseDTO, AppError>> {
    const created = await userService.create(
      { ...data, kycStatus: 'PENDING' },
      null
    );
    if (!created.success) return created;

    const session = await sessionService.createSession(
      created.value.id,
      userAgent,
      ipAddress
    );
    if (!session.success) return session;

    return Ok({
      user: created.value,
      accessToken: session.value.accessToken,
      refreshToken: session.value.refreshToken,
    });
  },

  async login(
    data: LoginDTO,
    userAgent?: string,
    ipAddress?: string
  ): Promise<Result<AuthResponseDTO, AppError>> {
    const user = await userRepository.findAuthByEmail(data.email);

    if (!user) {
      return Err(
        ErrorFactory.unauthorized(
          'Credenciais inválidas',
          'invalid_credentials',
          COMPONENT
        )
      );
    }

    const valid = await comparePassword(data.password, user.password);
    if (!valid) {
      return Err(
        ErrorFactory.unauthorized(
          'Credenciais inválidas',
          'invalid_credentials',
          COMPONENT
        )
      );
    }

    if (!user.isActive) {
      return Err(
        ErrorFactory.forbidden(
          'Conta desactivada',
          'account_inactive',
          COMPONENT
        )
      );
    }

    const session = await sessionService.createSession(
      user.id,
      userAgent,
      ipAddress
    );
    if (!session.success) return session;

    eventBus.publish({
      type: 'user.login',
      entityType: 'user_sessions',
      aggregateId: user.id,
      operation: 'INSERT',
      actorId: user.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      payload: { email: user.email },
    });

    const { password: _password, ...publicUser } = user;
    return Ok({
      user: publicUser,
      accessToken: session.value.accessToken,
      refreshToken: session.value.refreshToken,
    });
  },

  async refreshToken(
    refreshToken: string
  ): Promise<Result<RefreshSessionResponseDTO, AppError>> {
    return sessionService.refreshSession(refreshToken);
  },

  async logout(token: string): Promise<Result<void, AppError>> {
    return sessionService.revokeSession(token);
  },

  async me(userId: string): Promise<Result<UserResponseDTO, AppError>> {
    return userService.getById(userId);
  },
});
