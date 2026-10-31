import type { Result } from '@instantpay/utils';
import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  IUserRepository,
  IUserService,
  UserListFilters,
} from '../ports/user.port.js';
import type {
  CreateUserDTO,
  UpdateUserDTO,
  UserResponseDTO,
} from '../dtos/user.dto.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import { isUniqueViolation } from '../../../../shared/db/transaction.js';
import { hashPassword } from '../../../../shared/auth/password.js';

const COMPONENT = 'UserService';

type Conflict = { field: string; value: string; message: string };

const normalize = (value: string): string => value.trim();

export const createUserService = (
  repository: IUserRepository,
  eventBus: EventBus
): IUserService => {
  const findConflict = async (
    data: {
      username?: string;
      email?: string;
      phone?: string;
      biNumber?: string;
      nif?: string;
    },
    excludeId?: string
  ): Promise<Conflict | null> => {
    const checks: Array<{
      field: string;
      value: string | undefined;
      finder: (value: string) => Promise<{ id: string } | null>;
      message: string;
    }> = [
      {
        field: 'username',
        value: data.username,
        finder: repository.findByUsername,
        message: 'Username já registado',
      },
      {
        field: 'email',
        value: data.email,
        finder: repository.findByEmail,
        message: 'Email já registado',
      },
      {
        field: 'phone',
        value: data.phone,
        finder: repository.findByPhone,
        message: 'Telefone já registado',
      },
      {
        field: 'biNumber',
        value: data.biNumber,
        finder: repository.findByBiNumber,
        message: 'Número de BI já registado',
      },
      {
        field: 'nif',
        value: data.nif,
        finder: repository.findByNif,
        message: 'NIF já registado',
      },
    ];

    for (const check of checks) {
      if (!check.value) continue;
      const existing = await check.finder(check.value);
      if (existing && existing.id !== excludeId) {
        return {
          field: check.field,
          value: check.value,
          message: check.message,
        };
      }
    }

    return null;
  };

  return {
    async create(
      data: CreateUserDTO,
      actorId?: string | null
    ): Promise<Result<UserResponseDTO, AppError>> {
      const normalized: CreateUserDTO = {
        ...data,
        username: normalize(data.username),
        email: normalize(data.email).toLowerCase(),
        phone: normalize(data.phone),
        biNumber: normalize(data.biNumber),
        nif: normalize(data.nif),
        fullName: normalize(data.fullName),
        kycStatus: data.kycStatus ?? 'PENDING',
      };

      const conflict = await findConflict(normalized);
      if (conflict) {
        return Err(
          ErrorFactory.conflict(
            conflict.message,
            conflict.field,
            conflict.value,
            COMPONENT
          )
        );
      }

      const passwordHash = await hashPassword(data.password);

      try {
        const user = await repository.create({
          username: normalized.username,
          email: normalized.email,
          phone: normalized.phone,
          biNumber: normalized.biNumber,
          nif: normalized.nif,
          fullName: normalized.fullName,
          dateOfBirth: normalized.dateOfBirth,
          kycStatus: normalized.kycStatus,
          passwordHash,
        });

        eventBus.publish({
          type: 'user.created',
          entityType: 'users',
          aggregateId: user.id,
          operation: 'INSERT',
          actorId: actorId ?? null,
          payload: {
            username: user.username,
            email: user.email,
            kycStatus: user.kycStatus,
          },
        });

        return Ok(user);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return Err(
            ErrorFactory.conflict(
              'Já existe um utilizador com os mesmos dados únicos',
              undefined,
              undefined,
              COMPONENT
            )
          );
        }
        throw error;
      }
    },

    async getById(id: string): Promise<Result<UserResponseDTO, AppError>> {
      const user = await repository.findById(id);
      if (!user) {
        return Err(
          ErrorFactory.notFound('Utilizador não encontrado', 'User', id, COMPONENT)
        );
      }
      return Ok(user);
    },

    async list(
      params: PaginationParams,
      filters?: UserListFilters
    ): Promise<Result<ListResponse<UserResponseDTO>, AppError>> {
      const result = await repository.list(params, {
        search: filters?.search,
        kycStatus: filters?.kycStatus,
        isActive: filters?.isActive,
      });
      return Ok(result);
    },

    async update(
      id: string,
      data: UpdateUserDTO,
      actorId?: string | null
    ): Promise<Result<UserResponseDTO, AppError>> {
      const existing = await repository.findById(id);
      if (!existing) {
        return Err(
          ErrorFactory.notFound('Utilizador não encontrado', 'User', id, COMPONENT)
        );
      }

      const normalized: UpdateUserDTO = {
        ...data,
        ...(data.username !== undefined && { username: normalize(data.username) }),
        ...(data.email !== undefined && {
          email: normalize(data.email).toLowerCase(),
        }),
        ...(data.phone !== undefined && { phone: normalize(data.phone) }),
        ...(data.biNumber !== undefined && {
          biNumber: normalize(data.biNumber),
        }),
        ...(data.nif !== undefined && { nif: normalize(data.nif) }),
        ...(data.fullName !== undefined && {
          fullName: normalize(data.fullName),
        }),
      };

      const conflict = await findConflict(normalized, id);
      if (conflict) {
        return Err(
          ErrorFactory.conflict(
            conflict.message,
            conflict.field,
            conflict.value,
            COMPONENT
          )
        );
      }

      const passwordHash = data.password
        ? await hashPassword(data.password)
        : undefined;

      try {
        const updated = await repository.update(id, {
          ...normalized,
          passwordHash,
        });
        if (!updated) {
          return Err(
            ErrorFactory.notFound('Utilizador não encontrado', 'User', id, COMPONENT)
          );
        }

        eventBus.publish({
          type: 'user.updated',
          entityType: 'users',
          aggregateId: updated.id,
          operation: 'UPDATE',
          actorId: actorId ?? null,
          payload: {
            fields: Object.keys(normalized),
            username: updated.username,
            email: updated.email,
          },
        });

        return Ok(updated);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return Err(
            ErrorFactory.conflict(
              'Já existe um utilizador com os mesmos dados únicos',
              undefined,
              undefined,
              COMPONENT
            )
          );
        }
        throw error;
      }
    },

    async deactivate(
      id: string,
      actorId?: string | null
    ): Promise<Result<UserResponseDTO, AppError>> {
      const existing = await repository.findById(id);
      if (!existing) {
        return Err(
          ErrorFactory.notFound('Utilizador não encontrado', 'User', id, COMPONENT)
        );
      }
      if (!existing.isActive) {
        return Err(
          ErrorFactory.business(
            'Utilizador já está desactivado',
            'already_inactive',
            COMPONENT
          )
        );
      }

      const updated = await repository.setActive(id, false);
      if (!updated) {
        return Err(
          ErrorFactory.notFound('Utilizador não encontrado', 'User', id, COMPONENT)
        );
      }

      eventBus.publish({
        type: 'user.deactivated',
        entityType: 'users',
        aggregateId: updated.id,
        operation: 'UPDATE',
        actorId: actorId ?? null,
        payload: { isActive: false },
      });

      return Ok(updated);
    },

    async activate(
      id: string,
      actorId?: string | null
    ): Promise<Result<UserResponseDTO, AppError>> {
      const existing = await repository.findById(id);
      if (!existing) {
        return Err(
          ErrorFactory.notFound('Utilizador não encontrado', 'User', id, COMPONENT)
        );
      }
      if (existing.isActive) {
        return Err(
          ErrorFactory.business(
            'Utilizador já está activo',
            'already_active',
            COMPONENT
          )
        );
      }

      const updated = await repository.setActive(id, true);
      if (!updated) {
        return Err(
          ErrorFactory.notFound('Utilizador não encontrado', 'User', id, COMPONENT)
        );
      }

      eventBus.publish({
        type: 'user.activated',
        entityType: 'users',
        aggregateId: updated.id,
        operation: 'UPDATE',
        actorId: actorId ?? null,
        payload: { isActive: true },
      });

      return Ok(updated);
    },
  };
};
