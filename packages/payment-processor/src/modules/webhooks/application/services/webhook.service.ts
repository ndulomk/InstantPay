import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type { IWebhookService } from '../ports/webhook.port.js';
import type { IWebhookEventRepository } from '../ports/webhook.port.js';
import type { WebhookEventResponseDTO } from '../dtos/webhook.dto.js';
import type {
  IPaymentRepository,
  PaymentProviderRegistry,
  WebhookEventDTO,
} from '../../../payments/application/ports/payment.port.js';
import type {
  PaymentResponseDTO,
  PaymentStatus,
} from '../../../payments/application/dtos/payment.dto.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { isUniqueViolation } from '../../../../shared/db/transaction.js';

const COMPONENT = 'WebhookService';

type WebhookServiceOptions = {
  events: IWebhookEventRepository;
  payments: IPaymentRepository;
  providers: PaymentProviderRegistry;
  eventBus: EventBus;
};

const nextStatus = (
  current: PaymentStatus,
  event: 'payment.succeeded' | 'payment.requires_action' | 'payment.failed'
): PaymentStatus | null => {
  const settled =
    current === 'succeeded' ||
    current === 'partially_refunded' ||
    current === 'refunded';

  if (event === 'payment.succeeded') {
    return settled ? null : 'succeeded';
  }
  if (event === 'payment.requires_action') {
    return current === 'pending' || current === 'processing'
      ? 'requires_action'
      : null;
  }
  return settled ? null : 'failed';
};

export const createWebhookService = ({
  events,
  payments,
  providers,
  eventBus,
}: WebhookServiceOptions): IWebhookService => ({
  async handle(
    providerName: string,
    payload: string,
    signature?: string | null
  ): Promise<Result<WebhookEventResponseDTO, AppError>> {
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

    if (!provider.verifyWebhook(payload, signature)) {
      return Err(
        ErrorFactory.unauthorized(
          'Assinatura de webhook inválida',
          'invalid_token',
          COMPONENT
        )
      );
    }

    let event: WebhookEventDTO;
    let parsedPayload: Record<string, unknown>;
    try {
      event = provider.parseWebhook(payload);
      const parsed: unknown = JSON.parse(payload);
      parsedPayload =
        typeof parsed === 'object' && parsed !== null
          ? (parsed as Record<string, unknown>)
          : { value: parsed };
    } catch (error) {
      return Err(
        ErrorFactory.validation(
          'Payload de webhook inválido',
          [
            {
              field: 'body',
              message:
                error instanceof Error ? error.message : 'JSON inválido',
              rule: 'invalid_webhook',
            },
          ],
          COMPONENT
        )
      );
    }

    const existing = await events.findByEventId(providerName, event.eventId);
    if (existing) {
      return Ok(existing);
    }

    const payment = await payments.findByProviderReference(
      providerName,
      event.providerReference
    );
    if (!payment) {
      return Err(
        ErrorFactory.notFound(
          'Pagamento não encontrado para o webhook',
          'Payment',
          event.providerReference,
          COMPONENT
        )
      );
    }

    const status = nextStatus(payment.status, event.type);
    let updated: PaymentResponseDTO | null = payment;

    if (status) {
      updated = await payments.updateStatus(payment.id, {
        status,
        ...(status === 'succeeded' && { capturedAt: new Date() }),
        ...(status === 'failed' && {
          failureCode: event.failureCode ?? 'webhook_failed',
          failureMessage: event.failureMessage ?? 'Pagamento falhou',
        }),
      });
    }

    let stored: WebhookEventResponseDTO;
    try {
      stored = await events.create({
        provider: providerName,
        eventId: event.eventId,
        eventType: event.type,
        paymentId: payment.id,
        payload: parsedPayload,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const duplicate = await events.findByEventId(
          providerName,
          event.eventId
        );
        if (duplicate) return Ok(duplicate);
      }
      throw error;
    }

    eventBus.publish({
      type: 'webhook.processed',
      entityType: 'payment_webhook_events',
      aggregateId: stored.id,
      operation: 'INSERT',
      payload: {
        provider: providerName,
        eventId: event.eventId,
        eventType: event.type,
        paymentId: payment.id,
        paymentStatus: updated?.status ?? payment.status,
      },
    });

    return Ok(stored);
  },
});
