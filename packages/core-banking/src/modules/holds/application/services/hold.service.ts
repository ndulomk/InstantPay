import type { Result } from '@instantpay/utils';
import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  HoldListFilters,
  IHoldRepository,
  IHoldService,
} from '../ports/hold.port.js';
import type {
  CreateHoldDTO,
  HoldResponseDTO,
} from '../dtos/hold.dto.js';
import type { IAccountRepository } from '../../../accounts/application/ports/account.port.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import type { TransactionRunner } from '../../../../shared/db/transaction.js';
import { isPositiveMoney, roundMoney } from '../../../../shared/money/money.js';

const COMPONENT = 'HoldService';

export const createHoldService = (
  repository: IHoldRepository,
  accounts: IAccountRepository,
  eventBus: EventBus,
  withTransaction: TransactionRunner
): IHoldService => ({
  async create(
    data: CreateHoldDTO,
    actorId?: string | null
  ): Promise<Result<HoldResponseDTO, AppError>> {
    const amount = roundMoney(data.amount);
    if (!isPositiveMoney(amount)) {
      return Err(
        ErrorFactory.business(
          'O valor do bloqueio deve ser positivo',
          'invalid_amount',
          COMPONENT
        )
      );
    }
    if (data.expiresAt.getTime() <= Date.now()) {
      return Err(
        ErrorFactory.business(
          'A data de expiração deve estar no futuro',
          'invalid_expires_at',
          COMPONENT
        )
      );
    }

    const outcome = await withTransaction(
      async (tx): Promise<Result<HoldResponseDTO, AppError>> => {
        const account = await accounts.findByIdForUpdate(data.accountId, tx);
        if (!account) {
          return Err(
            ErrorFactory.notFound(
              'Conta não encontrada',
              'Account',
              data.accountId,
              COMPONENT
            )
          );
        }
        if (account.status !== 'active') {
          return Err(
            ErrorFactory.business(
              'Conta não está activa',
              'account_not_active',
              COMPONENT
            )
          );
        }
        if (account.availableBalance < amount) {
          return Err(
            ErrorFactory.business(
              'Saldo disponível insuficiente para bloqueio',
              'insufficient_funds',
              COMPONENT
            )
          );
        }

        const hold = await repository.create(
          {
            accountId: account.id,
            amount,
            holdType: data.holdType,
            expiresAt: data.expiresAt,
            transactionId: data.transactionId,
          },
          tx
        );

        await accounts.applyBalanceChange(
          account.id,
          {
            balanceDelta: 0,
            availableDelta: -amount,
            blockedDelta: amount,
          },
          tx
        );

        return Ok(hold);
      }
    );

    if (outcome.success) {
      eventBus.publish({
        type: 'hold.created',
        entityType: 'account_holds',
        aggregateId: outcome.value.id,
        operation: 'INSERT',
        actorId: actorId ?? null,
        payload: {
          accountId: outcome.value.accountId,
          amount: outcome.value.amount,
          holdType: outcome.value.holdType,
          expiresAt: outcome.value.expiresAt.toISOString(),
        },
      });
    }

    return outcome;
  },

  async getById(id: string): Promise<Result<HoldResponseDTO, AppError>> {
    const hold = await repository.findById(id);
    if (!hold) {
      return Err(
        ErrorFactory.notFound(
          'Bloqueio não encontrado',
          'AccountHold',
          id,
          COMPONENT
        )
      );
    }
    return Ok(hold);
  },

  async list(
    params: { cursor?: string | null; pageSize?: number },
    filters?: HoldListFilters
  ): Promise<Result<Awaited<ReturnType<IHoldRepository['list']>>, AppError>> {
    const result = await repository.list(params, filters);
    return Ok(result);
  },

  async release(
    id: string,
    actorId?: string | null
  ): Promise<Result<HoldResponseDTO, AppError>> {
    const outcome = await withTransaction(
      async (tx): Promise<Result<HoldResponseDTO, AppError>> => {
        const hold = await repository.findByIdForUpdate(id, tx);
        if (!hold) {
          return Err(
            ErrorFactory.notFound(
              'Bloqueio não encontrado',
              'AccountHold',
              id,
              COMPONENT
            )
          );
        }
        if (hold.releasedAt) {
          return Err(
            ErrorFactory.business(
              'Bloqueio já foi libertado',
              'already_released',
              COMPONENT
            )
          );
        }

        const account = await accounts.findByIdForUpdate(hold.accountId, tx);
        if (!account) {
          return Err(
            ErrorFactory.notFound(
              'Conta não encontrada',
              'Account',
              hold.accountId,
              COMPONENT
            )
          );
        }

        await accounts.applyBalanceChange(
          account.id,
          {
            balanceDelta: 0,
            availableDelta: hold.amount,
            blockedDelta: -hold.amount,
          },
          tx
        );

        const released = await repository.release(id, new Date(), tx);
        if (!released) {
          return Err(
            ErrorFactory.notFound(
              'Bloqueio não encontrado',
              'AccountHold',
              id,
              COMPONENT
            )
          );
        }
        return Ok(released);
      }
    );

    if (outcome.success) {
      eventBus.publish({
        type: 'hold.released',
        entityType: 'account_holds',
        aggregateId: outcome.value.id,
        operation: 'UPDATE',
        actorId: actorId ?? null,
        payload: {
          accountId: outcome.value.accountId,
          amount: outcome.value.amount,
          releasedAt: outcome.value.releasedAt?.toISOString() ?? null,
        },
      });
    }

    return outcome;
  },
});
