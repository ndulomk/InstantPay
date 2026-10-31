import type { Result } from '@instantpay/utils';
import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type { IBankRepository, IBankService, BankListFilters } from '../ports/bank.port.js';
import type {
  BankResponseDTO,
  CreateBankDTO,
  UpdateBankDTO,
} from '../dtos/bank.dto.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { isUniqueViolation } from '../../../../shared/db/transaction.js';

const COMPONENT = 'BankService';

const normalizeCode = (value: string): string => value.trim().toUpperCase();

export const createBankService = (
  repository: IBankRepository,
  eventBus: EventBus
): IBankService => ({
  async create(
    data: CreateBankDTO,
    actorId?: string | null
  ): Promise<Result<BankResponseDTO, AppError>> {
    const normalized: CreateBankDTO = {
      ...data,
      bankName: data.bankName.trim(),
      bankCode: normalizeCode(data.bankCode),
      ...(data.swiftCode !== undefined && {
        swiftCode: normalizeCode(data.swiftCode),
      }),
    };

    const existingCode = await repository.findByCode(normalized.bankCode);
    if (existingCode) {
      return Err(
        ErrorFactory.conflict(
          'Código de banco já registado',
          'bankCode',
          normalized.bankCode,
          COMPONENT
        )
      );
    }

    if (normalized.swiftCode) {
      const existingSwift = await repository.findBySwift(normalized.swiftCode);
      if (existingSwift) {
        return Err(
          ErrorFactory.conflict(
            'SWIFT já registado',
            'swiftCode',
            normalized.swiftCode,
            COMPONENT
          )
        );
      }
    }

    try {
      const bank = await repository.create(normalized);
      eventBus.publish({
        type: 'bank.created',
        entityType: 'banks',
        aggregateId: bank.id,
        operation: 'INSERT',
        actorId: actorId ?? null,
        payload: {
          bankName: bank.bankName,
          bankCode: bank.bankCode,
          reservePercentage: bank.reservePercentage,
        },
      });
      return Ok(bank);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return Err(
          ErrorFactory.conflict(
            'Banco já existe',
            'bankCode',
            normalized.bankCode,
            COMPONENT
          )
        );
      }
      throw error;
    }
  },

  async getById(id: string): Promise<Result<BankResponseDTO, AppError>> {
    const bank = await repository.findById(id);
    if (!bank) {
      return Err(
        ErrorFactory.notFound('Banco não encontrado', 'Bank', id, COMPONENT)
      );
    }
    return Ok(bank);
  },

  async list(
    params: { cursor?: string | null; pageSize?: number },
    filters?: BankListFilters
  ): Promise<Result<Awaited<ReturnType<IBankRepository['list']>>, AppError>> {
    const result = await repository.list(params, filters);
    return Ok(result);
  },

  async update(
    id: string,
    data: UpdateBankDTO,
    actorId?: string | null
  ): Promise<Result<BankResponseDTO, AppError>> {
    const existing = await repository.findById(id);
    if (!existing) {
      return Err(
        ErrorFactory.notFound('Banco não encontrado', 'Bank', id, COMPONENT)
      );
    }

    const normalized: UpdateBankDTO = {
      ...data,
      ...(data.bankName !== undefined && { bankName: data.bankName.trim() }),
      ...(data.bankCode !== undefined && {
        bankCode: normalizeCode(data.bankCode),
      }),
      ...(data.swiftCode !== undefined && {
        swiftCode: normalizeCode(data.swiftCode),
      }),
    };

    if (normalized.bankCode) {
      const withCode = await repository.findByCode(normalized.bankCode);
      if (withCode && withCode.id !== id) {
        return Err(
          ErrorFactory.conflict(
            'Código de banco já registado',
            'bankCode',
            normalized.bankCode,
            COMPONENT
          )
        );
      }
    }

    if (normalized.swiftCode) {
      const withSwift = await repository.findBySwift(normalized.swiftCode);
      if (withSwift && withSwift.id !== id) {
        return Err(
          ErrorFactory.conflict(
            'SWIFT já registado',
            'swiftCode',
            normalized.swiftCode,
            COMPONENT
          )
        );
      }
    }

    try {
      const updated = await repository.update(id, normalized);
      if (!updated) {
        return Err(
          ErrorFactory.notFound('Banco não encontrado', 'Bank', id, COMPONENT)
        );
      }

      eventBus.publish({
        type: 'bank.updated',
        entityType: 'banks',
        aggregateId: updated.id,
        operation: 'UPDATE',
        actorId: actorId ?? null,
        payload: {
          fields: Object.keys(normalized),
          bankName: updated.bankName,
          status: updated.status,
        },
      });

      return Ok(updated);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return Err(
          ErrorFactory.conflict(
            'Já existe um banco com os mesmos dados únicos',
            undefined,
            undefined,
            COMPONENT
          )
        );
      }
      throw error;
    }
  },

  async delete(
    id: string,
    actorId?: string | null
  ): Promise<Result<void, AppError>> {
    const bank = await repository.findById(id);
    if (!bank) {
      return Err(
        ErrorFactory.notFound('Banco não encontrado', 'Bank', id, COMPONENT)
      );
    }

    const accounts = await repository.countAccounts(id);
    if (accounts > 0) {
      return Err(
        ErrorFactory.conflict(
          'Banco tem contas associadas e não pode ser removido',
          'accounts',
          accounts,
          COMPONENT
        )
      );
    }

    await repository.delete(id);

    eventBus.publish({
      type: 'bank.deleted',
      entityType: 'banks',
      aggregateId: id,
      operation: 'DELETE',
      actorId: actorId ?? null,
      payload: { bankCode: bank.bankCode, bankName: bank.bankName },
    });

    return Ok(undefined);
  },
});
