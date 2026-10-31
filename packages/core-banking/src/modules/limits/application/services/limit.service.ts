import type { Result } from '@instantpay/utils';
import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  ITransactionLimitRepository,
  ITransactionLimitService,
  LimitListFilters,
} from '../ports/limit.port.js';
import {
  DEFAULT_DAILY_TRANSFER_LIMIT,
  DEFAULT_MONTHLY_LIMIT,
  DEFAULT_SINGLE_TRANSACTION_LIMIT,
} from '../dtos/limit.dto.js';
import type {
  TransactionLimitResponseDTO,
  UpsertTransactionLimitDTO,
} from '../dtos/limit.dto.js';
import type { IAccountRepository } from '../../../accounts/application/ports/account.port.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';

const COMPONENT = 'TransactionLimitService';

const defaults = (accountId: string): TransactionLimitResponseDTO => ({
  id: null,
  accountId,
  dailyTransferLimit: DEFAULT_DAILY_TRANSFER_LIMIT,
  singleTransactionLimit: DEFAULT_SINGLE_TRANSACTION_LIMIT,
  monthlyLimit: DEFAULT_MONTHLY_LIMIT,
  createdAt: null,
  updatedAt: null,
});

export const createTransactionLimitService = (
  repository: ITransactionLimitRepository,
  accounts: IAccountRepository,
  eventBus: EventBus
): ITransactionLimitService => ({
  async get(
    accountId: string
  ): Promise<Result<TransactionLimitResponseDTO, AppError>> {
    const account = await accounts.findById(accountId);
    if (!account) {
      return Err(
        ErrorFactory.notFound(
          'Conta não encontrada',
          'Account',
          accountId,
          COMPONENT
        )
      );
    }
    const limit = await repository.findByAccountId(accountId);
    return Ok(limit ?? defaults(accountId));
  },

  async upsert(
    accountId: string,
    data: UpsertTransactionLimitDTO,
    actorId?: string | null
  ): Promise<Result<TransactionLimitResponseDTO, AppError>> {
    const account = await accounts.findById(accountId);
    if (!account) {
      return Err(
        ErrorFactory.notFound(
          'Conta não encontrada',
          'Account',
          accountId,
          COMPONENT
        )
      );
    }
    if (account.status === 'closed') {
      return Err(
        ErrorFactory.business(
          'Conta encerrada não pode ter limites alterados',
          'account_closed',
          COMPONENT
        )
      );
    }

    const current = await repository.findByAccountId(accountId);
    const merged: Required<UpsertTransactionLimitDTO> = {
      dailyTransferLimit:
        data.dailyTransferLimit ??
        current?.dailyTransferLimit ??
        DEFAULT_DAILY_TRANSFER_LIMIT,
      singleTransactionLimit:
        data.singleTransactionLimit ??
        current?.singleTransactionLimit ??
        DEFAULT_SINGLE_TRANSACTION_LIMIT,
      monthlyLimit:
        data.monthlyLimit ??
        current?.monthlyLimit ??
        DEFAULT_MONTHLY_LIMIT,
    };

    if (merged.singleTransactionLimit > merged.dailyTransferLimit) {
      return Err(
        ErrorFactory.business(
          'Limite por transacção não pode exceder o limite diário',
          'single_limit_above_daily',
          COMPONENT
        )
      );
    }
    if (merged.dailyTransferLimit > merged.monthlyLimit) {
      return Err(
        ErrorFactory.business(
          'Limite diário não pode exceder o limite mensal',
          'daily_limit_above_monthly',
          COMPONENT
        )
      );
    }

    const limit = await repository.upsert(accountId, merged);

    eventBus.publish({
      type: 'limit.updated',
      entityType: 'transaction_limits',
      aggregateId: limit.id ?? accountId,
      operation: 'UPDATE',
      actorId: actorId ?? null,
      payload: {
        accountId,
        dailyTransferLimit: limit.dailyTransferLimit,
        singleTransactionLimit: limit.singleTransactionLimit,
        monthlyLimit: limit.monthlyLimit,
      },
    });

    return Ok(limit);
  },

  async list(
    params: { cursor?: string | null; pageSize?: number },
    filters?: LimitListFilters
  ): Promise<
    Result<
      Awaited<ReturnType<ITransactionLimitRepository['list']>>,
      AppError
    >
  > {
    const result = await repository.list(params, filters);
    return Ok(result);
  },
});
