import type { Result } from '@instantpay/utils';
import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  AccountListFilters,
  IAccountRepository,
  IAccountService,
} from '../ports/account.port.js';
import type {
  AccountResponseDTO,
  AccountStatus,
  CreateAccountDTO,
} from '../dtos/account.dto.js';
import type { IUserRepository } from '../../../users/application/ports/user.port.js';
import type { IBankRepository } from '../../../banks/application/ports/bank.port.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { isUniqueViolation } from '../../../../shared/db/transaction.js';

const COMPONENT = 'AccountService';

export const createAccountService = (
  repository: IAccountRepository,
  users: IUserRepository,
  banks: IBankRepository,
  eventBus: EventBus
): IAccountService => ({
  async create(
    data: CreateAccountDTO,
    actorId?: string | null
  ): Promise<Result<AccountResponseDTO, AppError>> {
    const user = await users.findById(data.userId);
    if (!user) {
      return Err(
        ErrorFactory.notFound(
          'Utilizador não encontrado',
          'User',
          data.userId,
          COMPONENT
        )
      );
    }
    if (!user.isActive) {
      return Err(
        ErrorFactory.business(
          'Utilizador está desactivado',
          'user_inactive',
          COMPONENT
        )
      );
    }

    const bank = await banks.findById(data.bankId);
    if (!bank) {
      return Err(
        ErrorFactory.notFound(
          'Banco não encontrado',
          'Bank',
          data.bankId,
          COMPONENT
        )
      );
    }
    if (!bank.status) {
      return Err(
        ErrorFactory.business(
          'Banco não está activo',
          'bank_inactive',
          COMPONENT
        )
      );
    }

    const accountNumber = await repository.nextAccountNumber(bank.bankCode);

    try {
      const account = await repository.create({
        userId: data.userId,
        bankId: data.bankId,
        accountType: data.accountType,
        currencyCode: data.currencyCode ?? 'AOA',
        accountNumber,
      });

      eventBus.publish({
        type: 'account.created',
        entityType: 'accounts',
        aggregateId: account.id,
        operation: 'INSERT',
        actorId: actorId ?? null,
        payload: {
          userId: account.userId,
          bankId: account.bankId,
          accountNumber: account.accountNumber,
          accountType: account.accountType,
          currencyCode: account.currencyCode,
        },
      });

      return Ok(account);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return Err(
          ErrorFactory.conflict(
            'Número de conta já existe',
            'accountNumber',
            accountNumber,
            COMPONENT
          )
        );
      }
      throw error;
    }
  },

  async getById(id: string): Promise<Result<AccountResponseDTO, AppError>> {
    const account = await repository.findById(id);
    if (!account) {
      return Err(
        ErrorFactory.notFound('Conta não encontrada', 'Account', id, COMPONENT)
      );
    }
    return Ok(account);
  },

  async getByNumber(
    accountNumber: string
  ): Promise<Result<AccountResponseDTO, AppError>> {
    const account = await repository.findByNumber(accountNumber);
    if (!account) {
      return Err(
        ErrorFactory.notFound(
          'Conta não encontrada',
          'Account',
          accountNumber,
          COMPONENT
        )
      );
    }
    return Ok(account);
  },

  async list(
    params: { cursor?: string | null; pageSize?: number },
    filters?: AccountListFilters
  ): Promise<Result<Awaited<ReturnType<IAccountRepository['list']>>, AppError>> {
    const result = await repository.list(params, filters);
    return Ok(result);
  },

  async updateStatus(
    id: string,
    status: AccountStatus,
    actorId?: string | null
  ): Promise<Result<AccountResponseDTO, AppError>> {
    const account = await repository.findById(id);
    if (!account) {
      return Err(
        ErrorFactory.notFound('Conta não encontrada', 'Account', id, COMPONENT)
      );
    }

    if (account.status === status) {
      return Err(
        ErrorFactory.business(
          'Conta já se encontra no estado solicitado',
          'same_status',
          COMPONENT
        )
      );
    }

    if (account.status === 'closed') {
      return Err(
        ErrorFactory.business(
          'Conta encerrada não pode ser reaberta',
          'account_closed',
          COMPONENT
        )
      );
    }

    if (status === 'closed') {
      if (account.balance !== 0 || account.blockedAmount !== 0) {
        return Err(
          ErrorFactory.business(
            'Só é possível encerrar contas com saldo e valores bloqueados a zero',
            'account_not_empty',
            COMPONENT
          )
        );
      }
    }

    const updated = await repository.updateStatus(
      id,
      status,
      status === 'closed' ? new Date() : null
    );
    if (!updated) {
      return Err(
        ErrorFactory.notFound('Conta não encontrada', 'Account', id, COMPONENT)
      );
    }

    eventBus.publish({
      type: 'account.status_changed',
      entityType: 'accounts',
      aggregateId: updated.id,
      operation: 'UPDATE',
      actorId: actorId ?? null,
      payload: {
        previousStatus: account.status,
        status: updated.status,
        accountNumber: updated.accountNumber,
      },
    });

    return Ok(updated);
  },
});
