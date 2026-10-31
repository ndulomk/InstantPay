import { randomUUID } from 'node:crypto';
import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type {
  IRefundRepository,
  IRefundService,
  RefundListFilters,
} from '../ports/refund.port.js';
import type {
  CreateRefundDTO,
  RefundResponseDTO,
} from '../dtos/refund.dto.js';
import type {
  IPaymentRepository,
  PaymentProviderRegistry,
} from '../../../payments/application/ports/payment.port.js';
import type { PaymentResponseDTO } from '../../../payments/application/dtos/payment.dto.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import type { TransactionRunner } from '../../../../shared/db/transaction.js';
import { isPositiveMoney, roundMoney } from '../../../../shared/money/money.js';
import type { PaginationParams } from '../../../../shared/pagination/pagination.js';

const COMPONENT = 'RefundService';

type RefundServiceOptions = {
  refunds: IRefundRepository;
  payments: IPaymentRepository;
  providers: PaymentProviderRegistry;
  eventBus: EventBus;
  withTransaction: TransactionRunner;
};

type PreparedRefund = {
  payment: PaymentResponseDTO;
  refund: RefundResponseDTO;
};

const generateReference = (): string => `RFD-${randomUUID()}`;

export const createRefundService = ({
  refunds,
  payments,
  providers,
  eventBus,
  withTransaction,
}: RefundServiceOptions): IRefundService => {
  const publish = (
    type: string,
    refund: RefundResponseDTO,
    actorId?: string | null,
    ipAddress?: string | null
  ): void => {
    eventBus.publish({
      type,
      entityType: 'payment_refunds',
      aggregateId: refund.id,
      operation: 'UPDATE',
      actorId: actorId ?? null,
      ipAddress: ipAddress ?? null,
      payload: {
        paymentId: refund.paymentId,
        reference: refund.reference,
        amount: refund.amount,
        status: refund.status,
        provider: refund.provider,
        providerRefundReference: refund.providerRefundReference,
      },
    });
  };

  return {
    async create(
      paymentId: string,
      data: CreateRefundDTO,
      actorId?: string | null,
      ipAddress?: string | null
    ): Promise<Result<RefundResponseDTO, AppError>> {
      const prepared = await withTransaction(
        async (tx): Promise<Result<PreparedRefund, AppError>> => {
          const payment = await payments.findByIdForUpdate(paymentId, tx);
          if (!payment) {
            return Err(
              ErrorFactory.notFound(
                'Pagamento não encontrado',
                'Payment',
                paymentId,
                COMPONENT
              )
            );
          }

          if (
            payment.status !== 'succeeded' &&
            payment.status !== 'partially_refunded'
          ) {
            return Err(
              ErrorFactory.business(
                `Pagamento não pode ser reembolsado no estado ${payment.status}`,
                'invalid_status',
                COMPONENT
              )
            );
          }

          if (!payment.providerReference) {
            return Err(
              ErrorFactory.business(
                'Pagamento sem referência no provider',
                'missing_provider_reference',
                COMPONENT
              )
            );
          }

          await refunds.failStaleProcessing(
            paymentId,
            new Date(Date.now() - 15 * 60 * 1_000),
            tx
          );
          const pending = await refunds.sumPendingRefunds(paymentId, tx);
          const remaining = roundMoney(
            payment.amount - payment.refundedAmount - pending
          );
          const amount = roundMoney(data.amount ?? remaining);

          if (!isPositiveMoney(amount) || amount > remaining) {
            return Err(
              ErrorFactory.business(
                `Valor de reembolso inválido (disponível: ${remaining})`,
                'invalid_refund_amount',
                COMPONENT
              )
            );
          }

          const refund = await refunds.create(
            {
              paymentId,
              reference: generateReference(),
              amount,
              status: 'processing',
              provider: payment.provider,
              reason: data.reason ?? null,
            },
            tx
          );

          return Ok({ payment, refund });
        }
      );

      if (!prepared.success) return prepared;

      const { payment, refund } = prepared.value;
      const provider = providers.get(payment.provider);
      if (!provider) {
        await refunds.updateStatus(refund.id, {
          status: 'failed',
          failureCode: 'provider_not_supported',
          failureMessage: `Provider não suportado: ${payment.provider}`,
        });
        return Err(
          ErrorFactory.business(
            `Provider não suportado: ${payment.provider}`,
            'provider_not_supported',
            COMPONENT
          )
        );
      }

      try {
        const result = await provider.refund({
          providerReference: payment.providerReference ?? '',
          reference: refund.reference,
          amount: refund.amount,
          currencyCode: payment.currencyCode,
          reason: refund.reason,
        });

        const outcome = await withTransaction(
          async (tx): Promise<Result<RefundResponseDTO, AppError>> => {
            if (result.status === 'failed') {
              const failed = await refunds.updateStatus(
                refund.id,
                {
                  status: 'failed',
                  failureCode: result.failureCode ?? 'refund_failed',
                  failureMessage:
                    result.failureMessage ?? 'Reembolso recusado',
                },
                tx
              );
              if (!failed) {
                return Err(
                  ErrorFactory.notFound(
                    'Reembolso não encontrado',
                    'Refund',
                    refund.id,
                    COMPONENT
                  )
                );
              }
              return Ok(failed);
            }

            const paymentUpdated = await payments.applyRefund(
              payment.id,
              refund.amount,
              tx
            );
            if (!paymentUpdated) {
              return Err(
                ErrorFactory.business(
                  'Não foi possível aplicar o reembolso ao pagamento',
                  'refund_not_applied',
                  COMPONENT
                )
              );
            }

            const updated = await refunds.updateStatus(
              refund.id,
              {
                status: 'succeeded',
                providerRefundReference: result.providerRefundReference,
              },
              tx
            );
            if (!updated) {
              return Err(
                ErrorFactory.notFound(
                  'Reembolso não encontrado',
                  'Refund',
                  refund.id,
                  COMPONENT
                )
              );
            }
            return Ok(updated);
          }
        );

        if (outcome.success) {
          publish(
            `refund.${outcome.value.status}`,
            outcome.value,
            actorId,
            ipAddress
          );
        }
        return outcome;
      } catch (error) {
        const failed = await refunds.updateStatus(refund.id, {
          status: 'failed',
          failureCode: 'provider_error',
          failureMessage:
            error instanceof Error ? error.message : 'Erro no provider',
        });

        if (failed) {
          publish('refund.failed', failed, actorId, ipAddress);
        }

        return Err(
          ErrorFactory.externalService(
            'Falha ao processar reembolso no provider',
            payment.provider,
            error,
            COMPONENT
          )
        );
      }
    },

    async getById(
      id: string
    ): Promise<Result<RefundResponseDTO, AppError>> {
      const refund = await refunds.findById(id);
      if (!refund) {
        return Err(
          ErrorFactory.notFound(
            'Reembolso não encontrado',
            'Refund',
            id,
            COMPONENT
          )
        );
      }
      return Ok(refund);
    },

    async list(
      paymentId: string,
      params: PaginationParams,
      filters?: RefundListFilters
    ): Promise<Result<Awaited<ReturnType<IRefundRepository['listByPayment']>>, AppError>> {
      return Ok(await refunds.listByPayment(paymentId, params, filters));
    },
  };
};
