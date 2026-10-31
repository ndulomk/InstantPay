import { randomUUID } from 'node:crypto';
import type { Result } from '@instantpay/utils';
import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  ITransactionRepository,
  ITransactionService,
  TransactionListFilters,
} from '../ports/transaction.port.js';
import type {
  DepositDTO,
  TransactionResponseDTO,
  TransferDTO,
  WithdrawalDTO,
} from '../dtos/transaction.dto.js';
import type { IAccountRepository } from '../../../accounts/application/ports/account.port.js';
import type { AccountResponseDTO } from '../../../accounts/application/dtos/account.dto.js';
import type { ITransactionLimitRepository } from '../../../limits/application/ports/limit.port.js';
import {
  DEFAULT_DAILY_TRANSFER_LIMIT,
  DEFAULT_MONTHLY_LIMIT,
  DEFAULT_SINGLE_TRANSACTION_LIMIT,
} from '../../../limits/application/dtos/limit.dto.js';
import type { ILedgerRepository } from '../../../ledger/application/ports/ledger.port.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import type { TransactionRunner } from '../../../../shared/db/transaction.js';
import { isUniqueViolation } from '../../../../shared/db/transaction.js';
import { isPositiveMoney, roundMoney } from '../../../../shared/money/money.js';

const COMPONENT = 'TransactionService';

type Limits = {
  dailyTransferLimit: number;
  singleTransactionLimit: number;
  monthlyLimit: number;
};

const FALLBACK_LIMITS: Limits = {
  dailyTransferLimit: DEFAULT_DAILY_TRANSFER_LIMIT,
  singleTransactionLimit: DEFAULT_SINGLE_TRANSACTION_LIMIT,
  monthlyLimit: DEFAULT_MONTHLY_LIMIT,
};

const generateReference = (): string => `TX-${randomUUID()}`;

const today = (): string => new Date().toISOString().slice(0, 10);

const invalidAmount = (value: number): Result<never, AppError> =>
  Err(
    ErrorFactory.business(
      `Valor inválido: ${value}`,
      'invalid_amount',
      COMPONENT
    )
  );

export const createTransactionService = (
  repository: ITransactionRepository,
  accounts: IAccountRepository,
  limits: ITransactionLimitRepository,
  ledger: ILedgerRepository,
  eventBus: EventBus,
  withTransaction: TransactionRunner
): ITransactionService => {
  const resolveLimits = async (
    accountId: string,
    tx: Parameters<typeof accounts.findByIdForUpdate>[1]
  ): Promise<Limits> => {
    const stored = await limits.findByAccountId(accountId, tx);
    return stored
      ? {
          dailyTransferLimit: stored.dailyTransferLimit,
          singleTransactionLimit: stored.singleTransactionLimit,
          monthlyLimit: stored.monthlyLimit,
        }
      : FALLBACK_LIMITS;
  };

  const checkOutgoingLimits = async (
    accountId: string,
    total: number,
    tx: Parameters<typeof accounts.findByIdForUpdate>[1]
  ): Promise<AppError | null> => {
    const config = await resolveLimits(accountId, tx);

    if (total > config.singleTransactionLimit) {
      return ErrorFactory.business(
        `O valor excede o limite por transacção (${config.singleTransactionLimit})`,
        'single_transaction_limit_exceeded',
        COMPONENT
      );
    }

    const daily = await repository.sumOutgoing(accountId, 'day', tx);
    if (roundMoney(daily + total) > config.dailyTransferLimit) {
      return ErrorFactory.business(
        `O valor excede o limite diário (${config.dailyTransferLimit})`,
        'daily_limit_exceeded',
        COMPONENT
      );
    }

    const monthly = await repository.sumOutgoing(accountId, 'month', tx);
    if (roundMoney(monthly + total) > config.monthlyLimit) {
      return ErrorFactory.business(
        `O valor excede o limite mensal (${config.monthlyLimit})`,
        'monthly_limit_exceeded',
        COMPONENT
      );
    }

    return null;
  };

  const ensureActive = (
    account: AccountResponseDTO,
    label: string
  ): AppError | null =>
    account.status === 'active'
      ? null
      : ErrorFactory.business(
          `${label} não está activa (estado: ${account.status})`,
          'account_not_active',
          COMPONENT
        );

  const publishTransaction = (
    transaction: TransactionResponseDTO,
    actorId?: string | null,
    ipAddress?: string | null
  ): void => {
    eventBus.publish({
      type: 'transaction.completed',
      entityType: 'transactions',
      aggregateId: transaction.id,
      operation: 'INSERT',
      actorId: actorId ?? null,
      ipAddress: ipAddress ?? null,
      payload: {
        reference: transaction.reference,
        transactionType: transaction.transactionType,
        amount: transaction.amount,
        fee: transaction.fee,
        fromAccountId: transaction.fromAccountId,
        toAccountId: transaction.toAccountId,
      },
    });
  };

  return {
    async transfer(
      data: TransferDTO,
      actorId?: string | null,
      ipAddress?: string | null
    ): Promise<Result<TransactionResponseDTO, AppError>> {
      const amount = roundMoney(data.amount);
      const fee = roundMoney(data.fee ?? 0);

      if (!isPositiveMoney(amount)) return invalidAmount(data.amount);
      if (!isPositiveMoney(fee) && fee !== 0) return invalidAmount(fee);
      if (data.fromAccountId === data.toAccountId) {
        return Err(
          ErrorFactory.business(
            'As contas de origem e destino devem ser diferentes',
            'same_account',
            COMPONENT
          )
        );
      }

      const reference = data.reference?.trim() || generateReference();
      const existing = await repository.findByReference(reference);
      if (existing) {
        return Err(
          ErrorFactory.conflict(
            'Referência de transacção já utilizada',
            'reference',
            reference,
            COMPONENT
          )
        );
      }

      try {
        const outcome = await withTransaction(
          async (tx): Promise<Result<TransactionResponseDTO, AppError>> => {
            const from = await accounts.findByIdForUpdate(
              data.fromAccountId,
              tx
            );
            if (!from) {
              return Err(
                ErrorFactory.notFound(
                  'Conta de origem não encontrada',
                  'Account',
                  data.fromAccountId,
                  COMPONENT
                )
              );
            }

            const to = await accounts.findByIdForUpdate(data.toAccountId, tx);
            if (!to) {
              return Err(
                ErrorFactory.notFound(
                  'Conta de destino não encontrada',
                  'Account',
                  data.toAccountId,
                  COMPONENT
                )
              );
            }

            const fromError = ensureActive(from, 'Conta de origem');
            if (fromError) return Err(fromError);

            const toError = ensureActive(to, 'Conta de destino');
            if (toError) return Err(toError);

            if (from.currencyCode !== to.currencyCode) {
              return Err(
                ErrorFactory.business(
                  'As contas têm moedas diferentes',
                  'currency_mismatch',
                  COMPONENT
                )
              );
            }

            const total = roundMoney(amount + fee);
            if (from.availableBalance < total) {
              return Err(
                ErrorFactory.business(
                  'Saldo disponível insuficiente',
                  'insufficient_funds',
                  COMPONENT
                )
              );
            }

            const limitError = await checkOutgoingLimits(from.id, total, tx);
            if (limitError) return Err(limitError);

            const now = new Date();
            const transaction = await repository.create(
              {
                fromAccountId: from.id,
                toAccountId: to.id,
                amount,
                fee,
                currencyCode: from.currencyCode,
                transactionType: 'TRANSFER',
                status: 'completed',
                reference,
                description: data.description ?? null,
                metadata: data.metadata ?? null,
                processedAt: now,
                completedAt: now,
              },
              tx
            );

            const updatedFrom = await accounts.applyBalanceChange(
              from.id,
              {
                balanceDelta: -total,
                availableDelta: -total,
                blockedDelta: 0,
                lastTransactionDate: now,
              },
              tx
            );

            const updatedTo = await accounts.applyBalanceChange(
              to.id,
              {
                balanceDelta: amount,
                availableDelta: amount,
                blockedDelta: 0,
                lastTransactionDate: now,
              },
              tx
            );

            await ledger.create(
              {
                accountId: from.id,
                transactionId: transaction.id,
                amount: total,
                balanceAfter: updatedFrom.balance,
                entryType: 'DEBIT',
                description:
                  data.description ?? `Transferência para ${to.accountNumber}`,
              },
              tx
            );

            await ledger.create(
              {
                accountId: to.id,
                transactionId: transaction.id,
                amount,
                balanceAfter: updatedTo.balance,
                entryType: 'CREDIT',
                description:
                  data.description ?? `Transferência de ${from.accountNumber}`,
              },
              tx
            );

            const date = today();
            await repository.upsertDailySummary(from.id, date, total, 0, tx);
            await repository.upsertDailySummary(to.id, date, 0, amount, tx);

            return Ok(transaction);
          }
        );

        if (outcome.success) {
          publishTransaction(outcome.value, actorId, ipAddress);
        }
        return outcome;
      } catch (error) {
        if (isUniqueViolation(error)) {
          return Err(
            ErrorFactory.conflict(
              'Referência de transacção já utilizada',
              'reference',
              reference,
              COMPONENT
            )
          );
        }
        throw error;
      }
    },

    async deposit(
      data: DepositDTO,
      actorId?: string | null,
      ipAddress?: string | null
    ): Promise<Result<TransactionResponseDTO, AppError>> {
      const amount = roundMoney(data.amount);
      if (!isPositiveMoney(amount)) return invalidAmount(data.amount);

      const reference = data.reference?.trim() || generateReference();
      const existing = await repository.findByReference(reference);
      if (existing) {
        return Err(
          ErrorFactory.conflict(
            'Referência de transacção já utilizada',
            'reference',
            reference,
            COMPONENT
          )
        );
      }

      try {
        const outcome = await withTransaction(
          async (tx): Promise<Result<TransactionResponseDTO, AppError>> => {
            const account = await accounts.findByIdForUpdate(
              data.toAccountId,
              tx
            );
            if (!account) {
              return Err(
                ErrorFactory.notFound(
                  'Conta não encontrada',
                  'Account',
                  data.toAccountId,
                  COMPONENT
                )
              );
            }

            const accountError = ensureActive(account, 'Conta de destino');
            if (accountError) return Err(accountError);

            const now = new Date();
            const transaction = await repository.create(
              {
                fromAccountId: null,
                toAccountId: account.id,
                amount,
                fee: 0,
                currencyCode: account.currencyCode,
                transactionType: 'DEPOSIT',
                status: 'completed',
                reference,
                description: data.description ?? null,
                metadata: data.metadata ?? null,
                processedAt: now,
                completedAt: now,
              },
              tx
            );

            const updated = await accounts.applyBalanceChange(
              account.id,
              {
                balanceDelta: amount,
                availableDelta: amount,
                blockedDelta: 0,
                lastTransactionDate: now,
              },
              tx
            );

            await ledger.create(
              {
                accountId: account.id,
                transactionId: transaction.id,
                amount,
                balanceAfter: updated.balance,
                entryType: 'CREDIT',
                description: data.description ?? 'Depósito',
              },
              tx
            );

            await repository.upsertDailySummary(
              account.id,
              today(),
              0,
              amount,
              tx
            );

            return Ok(transaction);
          }
        );

        if (outcome.success) {
          publishTransaction(outcome.value, actorId, ipAddress);
        }
        return outcome;
      } catch (error) {
        if (isUniqueViolation(error)) {
          return Err(
            ErrorFactory.conflict(
              'Referência de transacção já utilizada',
              'reference',
              reference,
              COMPONENT
            )
          );
        }
        throw error;
      }
    },

    async withdraw(
      data: WithdrawalDTO,
      actorId?: string | null,
      ipAddress?: string | null
    ): Promise<Result<TransactionResponseDTO, AppError>> {
      const amount = roundMoney(data.amount);
      const fee = roundMoney(data.fee ?? 0);

      if (!isPositiveMoney(amount)) return invalidAmount(data.amount);
      if (!isPositiveMoney(fee) && fee !== 0) return invalidAmount(fee);

      const reference = data.reference?.trim() || generateReference();
      const existing = await repository.findByReference(reference);
      if (existing) {
        return Err(
          ErrorFactory.conflict(
            'Referência de transacção já utilizada',
            'reference',
            reference,
            COMPONENT
          )
        );
      }

      try {
        const outcome = await withTransaction(
          async (tx): Promise<Result<TransactionResponseDTO, AppError>> => {
            const account = await accounts.findByIdForUpdate(
              data.fromAccountId,
              tx
            );
            if (!account) {
              return Err(
                ErrorFactory.notFound(
                  'Conta não encontrada',
                  'Account',
                  data.fromAccountId,
                  COMPONENT
                )
              );
            }

            const accountError = ensureActive(account, 'Conta de origem');
            if (accountError) return Err(accountError);

            const total = roundMoney(amount + fee);
            if (account.availableBalance < total) {
              return Err(
                ErrorFactory.business(
                  'Saldo disponível insuficiente',
                  'insufficient_funds',
                  COMPONENT
                )
              );
            }

            const limitError = await checkOutgoingLimits(
              account.id,
              total,
              tx
            );
            if (limitError) return Err(limitError);

            const now = new Date();
            const transaction = await repository.create(
              {
                fromAccountId: account.id,
                toAccountId: null,
                amount,
                fee,
                currencyCode: account.currencyCode,
                transactionType: 'WITHDRAWAL',
                status: 'completed',
                reference,
                description: data.description ?? null,
                metadata: data.metadata ?? null,
                processedAt: now,
                completedAt: now,
              },
              tx
            );

            const updated = await accounts.applyBalanceChange(
              account.id,
              {
                balanceDelta: -total,
                availableDelta: -total,
                blockedDelta: 0,
                lastTransactionDate: now,
              },
              tx
            );

            await ledger.create(
              {
                accountId: account.id,
                transactionId: transaction.id,
                amount: total,
                balanceAfter: updated.balance,
                entryType: 'DEBIT',
                description: data.description ?? 'Levantamento',
              },
              tx
            );

            await repository.upsertDailySummary(
              account.id,
              today(),
              total,
              0,
              tx
            );

            return Ok(transaction);
          }
        );

        if (outcome.success) {
          publishTransaction(outcome.value, actorId, ipAddress);
        }
        return outcome;
      } catch (error) {
        if (isUniqueViolation(error)) {
          return Err(
            ErrorFactory.conflict(
              'Referência de transacção já utilizada',
              'reference',
              reference,
              COMPONENT
            )
          );
        }
        throw error;
      }
    },

    async reverse(
      id: string,
      actorId?: string | null,
      ipAddress?: string | null
    ): Promise<Result<TransactionResponseDTO, AppError>> {
      const original = await repository.findById(id);
      if (!original) {
        return Err(
          ErrorFactory.notFound(
            'Transacção não encontrada',
            'Transaction',
            id,
            COMPONENT
          )
        );
      }
      if (original.status === 'reversed') {
        return Err(
          ErrorFactory.business(
            'Transacção já foi revertida',
            'already_reversed',
            COMPONENT
          )
        );
      }
      if (original.status !== 'completed') {
        return Err(
          ErrorFactory.business(
            'Apenas transacções concluídas podem ser revertidas',
            'invalid_status',
            COMPONENT
          )
        );
      }
      if (
        original.transactionType !== 'TRANSFER' ||
        !original.fromAccountId ||
        !original.toAccountId
      ) {
        return Err(
          ErrorFactory.business(
            'Apenas transferências podem ser revertidas',
            'not_reversible',
            COMPONENT
          )
        );
      }

      const outcome = await withTransaction(
        async (tx): Promise<Result<TransactionResponseDTO, AppError>> => {
          // Bloqueia a transacção original para impedir reversões concorrentes.
          const locked = await repository.findByIdForUpdate(id, tx);
          if (!locked) {
            return Err(
              ErrorFactory.notFound(
                'Transacção não encontrada',
                'Transaction',
                id,
                COMPONENT
              )
            );
          }
          if (locked.status === 'reversed') {
            return Err(
              ErrorFactory.business(
                'Transacção já foi revertida',
                'already_reversed',
                COMPONENT
              )
            );
          }
          if (locked.status !== 'completed') {
            return Err(
              ErrorFactory.business(
                'Apenas transacções concluídas podem ser revertidas',
                'invalid_status',
                COMPONENT
              )
            );
          }
          if (
            locked.transactionType !== 'TRANSFER' ||
            !locked.fromAccountId ||
            !locked.toAccountId
          ) {
            return Err(
              ErrorFactory.business(
                'Apenas transferências podem ser revertidas',
                'not_reversible',
                COMPONENT
              )
            );
          }

          // Mantém a mesma ordem de bloqueio usada em transfer(): origem, depois destino.
          const sender = await accounts.findByIdForUpdate(
            locked.fromAccountId,
            tx
          );
          if (!sender) {
            return Err(
              ErrorFactory.notFound(
                'Conta de origem não encontrada',
                'Account',
                locked.fromAccountId,
                COMPONENT
              )
            );
          }

          const recipient = await accounts.findByIdForUpdate(
            locked.toAccountId,
            tx
          );
          if (!recipient) {
            return Err(
              ErrorFactory.notFound(
                'Conta de destino não encontrada',
                'Account',
                locked.toAccountId,
                COMPONENT
              )
            );
          }

          const amount = locked.amount;

          if (recipient.availableBalance < amount) {
            return Err(
              ErrorFactory.business(
                'Saldo insuficiente na conta de destino para reverter',
                'insufficient_funds_for_reversal',
                COMPONENT
              )
            );
          }

          const now = new Date();
          const refund = await repository.create(
            {
              fromAccountId: recipient.id,
              toAccountId: sender.id,
              amount,
              fee: 0,
              currencyCode: recipient.currencyCode,
              transactionType: 'REFUND',
              status: 'completed',
              reference: `RF-${randomUUID()}`,
              description: `Reversão de ${locked.reference}`,
              metadata: { originalTransactionId: locked.id },
              processedAt: now,
              completedAt: now,
            },
            tx
          );

          const updatedRecipient = await accounts.applyBalanceChange(
            recipient.id,
            {
              balanceDelta: -amount,
              availableDelta: -amount,
              blockedDelta: 0,
              lastTransactionDate: now,
            },
            tx
          );

          const updatedSender = await accounts.applyBalanceChange(
            sender.id,
            {
              balanceDelta: amount,
              availableDelta: amount,
              blockedDelta: 0,
              lastTransactionDate: now,
            },
            tx
          );

          await ledger.create(
            {
              accountId: recipient.id,
              transactionId: refund.id,
              amount,
              balanceAfter: updatedRecipient.balance,
              entryType: 'DEBIT',
              description: `Reversão de ${locked.reference}`,
            },
            tx
          );

          await ledger.create(
            {
              accountId: sender.id,
              transactionId: refund.id,
              amount,
              balanceAfter: updatedSender.balance,
              entryType: 'CREDIT',
              description: `Reversão de ${locked.reference}`,
            },
            tx
          );

          const date = today();
          await repository.upsertDailySummary(recipient.id, date, amount, 0, tx);
          await repository.upsertDailySummary(sender.id, date, 0, amount, tx);

          await repository.updateStatus(
            locked.id,
            'reversed',
            { processedAt: now, completedAt: now },
            tx
          );

          return Ok(refund);
        }
      );

      if (outcome.success) {
        publishTransaction(outcome.value, actorId, ipAddress);
        eventBus.publish({
          type: 'transaction.reversed',
          entityType: 'transactions',
          aggregateId: original.id,
          operation: 'UPDATE',
          actorId: actorId ?? null,
          ipAddress: ipAddress ?? null,
          payload: {
            reference: original.reference,
            refundReference: outcome.value.reference,
          },
        });
      }

      return outcome;
    },

    async getById(
      id: string
    ): Promise<Result<TransactionResponseDTO, AppError>> {
      const transaction = await repository.findById(id);
      if (!transaction) {
        return Err(
          ErrorFactory.notFound(
            'Transacção não encontrada',
            'Transaction',
            id,
            COMPONENT
          )
        );
      }
      return Ok(transaction);
    },

    async list(
      params: { cursor?: string | null; pageSize?: number },
      filters?: TransactionListFilters
    ): Promise<
      Result<Awaited<ReturnType<ITransactionRepository['list']>>, AppError>
    > {
      const result = await repository.list(params, filters);
      return Ok(result);
    },
  };
};
