import { randomUUID } from 'node:crypto';
import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type {
  IPaymentRepository,
  IPaymentService,
  PaymentListFilters,
  PaymentProviderRegistry,
} from '../ports/payment.port.js';
import type {
  CreatePaymentDTO,
  PaymentResponseDTO,
  PaymentStatus,
} from '../dtos/payment.dto.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import type { TransactionRunner } from '../../../../shared/db/transaction.js';
import { isUniqueViolation } from '../../../../shared/db/transaction.js';
import {
  isPositiveMoney,
  moneyEquals,
  roundMoney,
} from '../../../../shared/money/money.js';
import type { PaginationParams } from '../../../../shared/pagination/pagination.js';

const COMPONENT = 'PaymentService';

type PaymentServiceOptions = {
  repository: IPaymentRepository;
  providers: PaymentProviderRegistry;
  eventBus: EventBus;
  withTransaction: TransactionRunner;
  defaultProvider: string;
  defaultCurrency: string;
};

const generateReference = (): string => `PAY-${randomUUID()}`;

const mapChargeStatus = (
  status: 'succeeded' | 'requires_action' | 'failed'
): PaymentStatus => status;

export const createPaymentService = ({
  repository,
  providers,
  eventBus,
  withTransaction,
  defaultProvider,
  defaultCurrency,
}: PaymentServiceOptions): IPaymentService => {
  const publish = (
    type: string,
    payment: PaymentResponseDTO,
    actorId?: string | null,
    ipAddress?: string | null
  ): void => {
    eventBus.publish({
      type,
      entityType: 'payment_payments',
      aggregateId: payment.id,
      operation: 'UPDATE',
      actorId: actorId ?? null,
      ipAddress: ipAddress ?? null,
      payload: {
        reference: payment.reference,
        status: payment.status,
        amount: payment.amount,
        currencyCode: payment.currencyCode,
        provider: payment.provider,
        providerReference: payment.providerReference,
        merchantReference: payment.merchantReference,
      },
    });
  };

  const checkIdempotentMatch = (
    existing: PaymentResponseDTO,
    data: CreatePaymentDTO,
    amount: number,
    currencyCode: string,
    provider: string
  ): Result<PaymentResponseDTO, AppError> | null => {
    if (
      !moneyEquals(existing.amount, amount) ||
      existing.currencyCode !== currencyCode ||
      existing.method !== data.method ||
      existing.provider !== provider
    ) {
      return Err(
        ErrorFactory.conflict(
          'Idempotency-Key já usada com parâmetros diferentes',
          'idempotencyKey',
          data.idempotencyKey,
          COMPONENT
        )
      );
    }
    return Ok(existing);
  };

  return {
    async create(
      data: CreatePaymentDTO,
      actorId?: string | null,
      ipAddress?: string | null
    ): Promise<Result<PaymentResponseDTO, AppError>> {
      const amount = roundMoney(data.amount);
      if (!isPositiveMoney(amount)) {
        return Err(
          ErrorFactory.business(
            'Valor de pagamento inválido',
            'invalid_amount',
            COMPONENT
          )
        );
      }

      const currencyCode = (data.currencyCode ?? defaultCurrency).toUpperCase();
      const providerName = data.provider ?? defaultProvider;
      const provider = providers.get(providerName);

      if (!provider) {
        return Err(
          ErrorFactory.business(
            `Provider de pagamento não suportado: ${providerName}`,
            'provider_not_supported',
            COMPONENT
          )
        );
      }

      const idempotencyKey = data.idempotencyKey?.trim() || null;
      if (idempotencyKey) {
        const existing = await repository.findByIdempotencyKey(idempotencyKey);
        if (existing) {
          return (
            checkIdempotentMatch(
              existing,
              data,
              amount,
              currencyCode,
              providerName
            ) ?? Ok(existing)
          );
        }
      }

      let payment: PaymentResponseDTO;
      try {
        payment = await repository.create({
          reference: generateReference(),
          idempotencyKey,
          merchantReference: data.merchantReference ?? null,
          amount,
          currencyCode,
          status: 'processing',
          method: data.method,
          provider: providerName,
          description: data.description ?? null,
          metadata: data.metadata ?? null,
          customerEmail: data.customerEmail ?? null,
          customerPhone: data.customerPhone ?? null,
        });
      } catch (error) {
        if (isUniqueViolation(error) && idempotencyKey) {
          const existing =
            await repository.findByIdempotencyKey(idempotencyKey);
          if (existing) {
            return (
              checkIdempotentMatch(
                existing,
                data,
                amount,
                currencyCode,
                providerName
              ) ?? Ok(existing)
            );
          }
        }
        throw error;
      }

      publish('payment.created', payment, actorId, ipAddress);

      try {
        const charge = await provider.createCharge({
          reference: payment.reference,
          amount,
          currencyCode,
          method: data.method,
          description: data.description ?? null,
          metadata: data.metadata ?? null,
          customerEmail: data.customerEmail ?? null,
          customerPhone: data.customerPhone ?? null,
        });

        const updated = await repository.updateStatus(payment.id, {
          status: mapChargeStatus(charge.status),
          providerReference: charge.providerReference,
          failureCode: charge.failureCode ?? null,
          failureMessage: charge.failureMessage ?? null,
          authorizedAt: charge.authorizedAt ?? null,
          capturedAt: charge.capturedAt ?? null,
        });

        if (!updated) {
          return Err(
            ErrorFactory.notFound(
              'Pagamento não encontrado após cobrança',
              'Payment',
              payment.id,
              COMPONENT
            )
          );
        }

        publish(`payment.${updated.status}`, updated, actorId, ipAddress);
        return Ok(updated);
      } catch (error) {
        const failed = await repository.updateStatus(payment.id, {
          status: 'failed',
          failureCode: 'provider_error',
          failureMessage:
            error instanceof Error ? error.message : 'Erro no provider',
        });

        if (failed) {
          publish('payment.failed', failed, actorId, ipAddress);
        }

        return Err(
          ErrorFactory.externalService(
            'Falha ao processar pagamento no provider',
            providerName,
            error,
            COMPONENT
          )
        );
      }
    },

    async getById(
      id: string
    ): Promise<Result<PaymentResponseDTO, AppError>> {
      const payment = await repository.findById(id);
      if (!payment) {
        return Err(
          ErrorFactory.notFound(
            'Pagamento não encontrado',
            'Payment',
            id,
            COMPONENT
          )
        );
      }
      return Ok(payment);
    },

    async getByReference(
      reference: string
    ): Promise<Result<PaymentResponseDTO, AppError>> {
      const payment = await repository.findByReference(reference);
      if (!payment) {
        return Err(
          ErrorFactory.notFound(
            'Pagamento não encontrado',
            'Payment',
            reference,
            COMPONENT
          )
        );
      }
      return Ok(payment);
    },

    async list(
      params: PaginationParams,
      filters?: PaymentListFilters
    ): Promise<Result<Awaited<ReturnType<IPaymentRepository['list']>>, AppError>> {
      return Ok(await repository.list(params, filters));
    },

    async cancel(
      id: string,
      actorId?: string | null,
      ipAddress?: string | null
    ): Promise<Result<PaymentResponseDTO, AppError>> {
      const outcome = await withTransaction(async (tx) => {
        const payment = await repository.findByIdForUpdate(id, tx);
        if (!payment) {
          return Err(
            ErrorFactory.notFound(
              'Pagamento não encontrado',
              'Payment',
              id,
              COMPONENT
            )
          );
        }

        if (
          payment.status !== 'pending' &&
          payment.status !== 'processing' &&
          payment.status !== 'requires_action'
        ) {
          return Err(
            ErrorFactory.business(
              `Pagamento não pode ser cancelado no estado ${payment.status}`,
              'invalid_status',
              COMPONENT
            )
          );
        }

        const updated = await repository.updateStatus(
          id,
          { status: 'cancelled' },
          tx
        );
        if (!updated) {
          return Err(
            ErrorFactory.notFound(
              'Pagamento não encontrado',
              'Payment',
              id,
              COMPONENT
            )
          );
        }
        return Ok(updated);
      });

      if (outcome.success) {
        publish('payment.cancelled', outcome.value, actorId, ipAddress);
      }
      return outcome;
    },
  };
};
