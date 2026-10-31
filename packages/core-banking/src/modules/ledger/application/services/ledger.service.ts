import type { Result } from '@instantpay/utils';
import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  ILedgerRepository,
  ILedgerService,
  LedgerListFilters,
} from '../ports/ledger.port.js';
import type { LedgerEntryResponseDTO } from '../dtos/ledger.dto.js';
import type { IAccountRepository } from '../../../accounts/application/ports/account.port.js';
import type { ITransactionRepository } from '../../../transactions/application/ports/transaction.port.js';

const COMPONENT = 'LedgerService';

export const createLedgerService = (
  repository: ILedgerRepository,
  accounts: IAccountRepository,
  transactions: ITransactionRepository
): ILedgerService => ({
  async list(
    params: { cursor?: string | null; pageSize?: number },
    filters?: LedgerListFilters
  ): Promise<
    Result<Awaited<ReturnType<ILedgerRepository['list']>>, AppError>
  > {
    const result = await repository.list(params, filters);
    return Ok(result);
  },

  async listByAccount(
    accountId: string,
    params: { cursor?: string | null; pageSize?: number },
    filters?: Omit<LedgerListFilters, 'accountId'>
  ): Promise<Result<Awaited<ReturnType<ILedgerRepository['list']>>, AppError>> {
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

    const result = await repository.list(params, { ...filters, accountId });
    return Ok(result);
  },

  async listByTransaction(
    transactionId: string,
    params: { cursor?: string | null; pageSize?: number }
  ): Promise<Result<Awaited<ReturnType<ILedgerRepository['list']>>, AppError>> {
    const transaction = await transactions.findById(transactionId);
    if (!transaction) {
      return Err(
        ErrorFactory.notFound(
          'Transacção não encontrada',
          'Transaction',
          transactionId,
          COMPONENT
        )
      );
    }

    const result = await repository.list(params, { transactionId });
    return Ok(result);
  },
});
