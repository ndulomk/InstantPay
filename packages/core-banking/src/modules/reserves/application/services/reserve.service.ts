import type { Result } from '@instantpay/utils';
import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  IReserveRepository,
  IReserveService,
  ReserveListFilters,
} from '../ports/reserve.port.js';
import type {
  CreateReserveDTO,
  ReserveResponseDTO,
} from '../dtos/reserve.dto.js';
import type { IBankRepository } from '../../../banks/application/ports/bank.port.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { roundMoney } from '../../../../shared/money/money.js';

const COMPONENT = 'ReserveService';

export const createReserveService = (
  repository: IReserveRepository,
  banks: IBankRepository,
  eventBus: EventBus
): IReserveService => ({
  async calculate(
    data: CreateReserveDTO,
    actorId?: string | null
  ): Promise<Result<ReserveResponseDTO, AppError>> {
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

    const calculationDate = (data.calculationDate ?? new Date())
      .toISOString()
      .slice(0, 10);

    const totalDeposits = roundMoney(
      await repository.sumDeposits(bank.id)
    );
    const requiredReserve = roundMoney(
      totalDeposits * bank.reservePercentage
    );
    const actualReserve = roundMoney(data.actualReserve);

    const reserve = await repository.upsert({
      bankId: bank.id,
      calculationDate,
      totalDeposits,
      requiredReserve,
      actualReserve,
    });

    eventBus.publish({
      type: 'reserve.calculated',
      entityType: 'bank_reserves',
      aggregateId: reserve.id,
      operation: 'INSERT',
      actorId: actorId ?? null,
      payload: {
        bankId: reserve.bankId,
        calculationDate: reserve.calculationDate,
        totalDeposits: reserve.totalDeposits,
        requiredReserve: reserve.requiredReserve,
        actualReserve: reserve.actualReserve,
        isCompliant: reserve.isCompliant,
      },
    });

    return Ok(reserve);
  },

  async getById(id: string): Promise<Result<ReserveResponseDTO, AppError>> {
    const reserve = await repository.findById(id);
    if (!reserve) {
      return Err(
        ErrorFactory.notFound(
          'Cálculo de reserva não encontrado',
          'BankReserve',
          id,
          COMPONENT
        )
      );
    }
    return Ok(reserve);
  },

  async getLatestByBank(
    bankId: string
  ): Promise<Result<ReserveResponseDTO | null, AppError>> {
    const bank = await banks.findById(bankId);
    if (!bank) {
      return Err(
        ErrorFactory.notFound(
          'Banco não encontrado',
          'Bank',
          bankId,
          COMPONENT
        )
      );
    }
    return Ok(await repository.findLatestByBank(bankId));
  },

  async list(
    params: { cursor?: string | null; pageSize?: number },
    filters?: ReserveListFilters
  ): Promise<Result<Awaited<ReturnType<IReserveRepository['list']>>, AppError>> {
    const result = await repository.list(params, filters);
    return Ok(result);
  },
});
