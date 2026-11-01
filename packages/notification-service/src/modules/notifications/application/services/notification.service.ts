import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type {
  INotificationRepository,
  INotificationService,
  ProviderRegistry,
} from '../ports/notification.port.js';
import type {
  CreateNotificationDTO,
  DeliveryStatus,
  NotificationListFilters,
  NotificationResponseDTO,
} from '../dtos/notification.dto.js';
import type { ITemplateRepository } from '../../../templates/application/ports/template.port.js';
import {
  findMissingVariables,
  renderTemplate,
  type TemplateVariables,
} from '../../../templates/application/services/template-renderer.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import type { TransactionRunner } from '../../../../shared/db/transaction.js';
import { isUniqueViolation } from '../../../../shared/db/transaction.js';
import type { PaginationParams } from '../../../../shared/pagination/pagination.js';

const COMPONENT = 'NotificationService';

const providerErrorDetails = (
  error: unknown
): { code: string; message: string } => {
  if (typeof error === 'object' && error !== null) {
    const record = error as { code?: unknown; message?: unknown };
    return {
      code: typeof record.code === 'string' ? record.code : 'PROVIDER_ERROR',
      message:
        typeof record.message === 'string'
          ? record.message
          : 'Falha desconhecida do provider',
    };
  }

  return {
    code: 'PROVIDER_ERROR',
    message: String(error),
  };
};

export const createNotificationService = (deps: {
  notifications: INotificationRepository;
  templates: ITemplateRepository;
  providers: ProviderRegistry;
  eventBus: EventBus;
  withTransaction: TransactionRunner;
  maxAttempts: number;
}): INotificationService => {
  const {
    notifications,
    templates,
    providers,
    eventBus,
    withTransaction,
    maxAttempts,
  } = deps;

  const publish = (
    type: string,
    notification: NotificationResponseDTO
  ): void => {
    eventBus.publish({
      type,
      entityType: 'notifications',
      aggregateId: notification.id,
      operation: type === 'notification.created' ? 'INSERT' : 'UPDATE',
      payload: {
        channel: notification.channel,
        recipient: notification.recipient,
        templateCode: notification.templateCode,
        status: notification.status,
        attempts: notification.attempts,
        providerMessageId: notification.providerMessageId,
      },
    });
  };

  const deliver = async (
    notification: NotificationResponseDTO,
    attempt: number,
    tx?: Parameters<INotificationRepository['updateState']>[2]
  ): Promise<NotificationResponseDTO> => {
    const provider = providers.get(notification.channel);

    try {
      const result = await provider.send({
        notificationId: notification.id,
        channel: notification.channel,
        recipient: notification.recipient,
        subject: notification.subject,
        body: notification.body,
        attempt,
      });

      await notifications.createDelivery(
        {
          notificationId: notification.id,
          attemptNumber: attempt,
          status: 'sent',
          provider: provider.name,
          providerMessageId: result.providerMessageId,
        },
        tx
      );

      const updated = await notifications.updateState(
        notification.id,
        {
          status: 'sent',
          attempts: attempt,
          provider: provider.name,
          providerMessageId: result.providerMessageId,
          lastError: null,
          sentAt: new Date(),
        },
        tx
      );

      if (!updated) {
        throw new Error('Notificação desapareceu durante a entrega');
      }
      return updated;
    } catch (error) {
      const details = providerErrorDetails(error);
      const exhausted = attempt >= notification.maxAttempts;
      const deliveryStatus: DeliveryStatus = 'failed';

      await notifications.createDelivery(
        {
          notificationId: notification.id,
          attemptNumber: attempt,
          status: deliveryStatus,
          provider: provider.name,
          errorCode: details.code,
          errorMessage: details.message,
        },
        tx
      );

      const updated = await notifications.updateState(
        notification.id,
        {
          status: exhausted ? 'failed' : 'pending',
          attempts: attempt,
          provider: provider.name,
          lastError: details.message,
          ...(exhausted && { failedAt: new Date() }),
        },
        tx
      );

      if (!updated) {
        throw new Error('Notificação desapareceu durante a entrega');
      }
      return updated;
    }
  };

  const resolveContent = async (
    data: CreateNotificationDTO
  ): Promise<Result<{
    templateId: string | null;
    templateCode: string | null;
    channel: NonNullable<CreateNotificationDTO['channel']>;
    subject: string | null;
    body: string;
    variables: TemplateVariables;
  }, AppError>> => {
    if (!data.templateCode) {
      const body = data.body;
      const channel = data.channel;
      if (!body || !channel) {
        return Err(
          ErrorFactory.business(
            'Canal e corpo são obrigatórios sem template',
            'notification_content_required',
            COMPONENT
          )
        );
      }

      const variables = data.variables ?? {};
      const missing = findMissingVariables(
        [],
        data.subject ?? null,
        body,
        variables
      );
      if (missing.length > 0) {
        return Err(
          ErrorFactory.validation(
            'Faltam variáveis para renderizar a notificação',
            missing.map((name) => ({
              field: `variables.${name}`,
              message: `A variável "${name}" é obrigatória`,
              rule: 'missing_variable',
            })),
            COMPONENT
          )
        );
      }

      return Ok({
        templateId: null,
        templateCode: null,
        channel,
        subject: data.subject ?? null,
        body,
        variables,
      });
    }

    const template = await templates.findByCode(data.templateCode);
    if (!template) {
      return Err(
        ErrorFactory.notFound(
          'Template não encontrado',
          'NotificationTemplate',
          data.templateCode,
          COMPONENT
        )
      );
    }
    if (!template.isActive) {
      return Err(
        ErrorFactory.business(
          'O template está inactivo',
          'template_inactive',
          COMPONENT
        )
      );
    }

    const variables = data.variables ?? {};
    const missing = findMissingVariables(
      template.variables,
      template.subject,
      template.body,
      variables
    );
    if (missing.length > 0) {
      return Err(
        ErrorFactory.validation(
          'Faltam variáveis para renderizar o template',
          missing.map((name) => ({
            field: `variables.${name}`,
            message: `A variável "${name}" é obrigatória`,
            rule: 'missing_variable',
          })),
          COMPONENT
        )
      );
    }

    return Ok({
      templateId: template.id,
      templateCode: template.code,
      channel: template.channel,
      subject: template.subject
        ? renderTemplate(template.subject, variables)
        : null,
      body: renderTemplate(template.body, variables),
      variables,
    });
  };

  return {
    async create(
      data: CreateNotificationDTO,
      idempotencyKey?: string
    ): Promise<Result<NotificationResponseDTO, AppError>> {
      const key = idempotencyKey ?? data.idempotencyKey ?? null;
      if (key) {
        const existing = await notifications.findByIdempotencyKey(key);
        if (existing) return Ok(existing);
      }

      const content = await resolveContent(data);
      if (!content.success) return content;

      const created = await (async (): Promise<
        NotificationResponseDTO
      > => {
        try {
          return await notifications.create({
            ...content.value,
            recipient: data.recipient,
            maxAttempts,
            idempotencyKey: key,
            metadata: data.metadata ?? null,
          });
        } catch (error) {
          if (key && isUniqueViolation(error)) {
            const existing =
              await notifications.findByIdempotencyKey(key);
            if (existing) return existing;
          }
          throw error;
        }
      })();

      const shouldDeliver = created.attempts === 0 && created.status === 'pending';
      if (!shouldDeliver) return Ok(created);

      publish('notification.created', created);

      const delivered = await deliver(created, 1);
      publish(
        delivered.status === 'sent'
          ? 'notification.sent'
          : 'notification.failed',
        delivered
      );

      return Ok(delivered);
    },

    async getById(
      id: string
    ): Promise<Result<NotificationResponseDTO, AppError>> {
      const notification = await notifications.findById(id);
      if (!notification) {
        return Err(
          ErrorFactory.notFound(
            'Notificação não encontrada',
            'Notification',
            id,
            COMPONENT
          )
        );
      }
      return Ok(notification);
    },

    async list(
      params: PaginationParams,
      filters?: NotificationListFilters
    ): Promise<Result<Awaited<ReturnType<INotificationRepository['list']>>, AppError>> {
      return Ok(await notifications.list(params, filters));
    },

    async retry(
      id: string
    ): Promise<Result<NotificationResponseDTO, AppError>> {
      const result = await withTransaction(async (tx) => {
        const notification = await notifications.findByIdForUpdate(id, tx);
        if (!notification) {
          return Err(
            ErrorFactory.notFound(
              'Notificação não encontrada',
              'Notification',
              id,
              COMPONENT
            )
          );
        }

        if (notification.status === 'sent') {
          return Err(
            ErrorFactory.business(
              'A notificação já foi entregue',
              'notification_already_sent',
              COMPONENT
            )
          );
        }
        if (notification.status === 'cancelled') {
          return Err(
            ErrorFactory.business(
              'A notificação foi cancelada',
              'notification_cancelled',
              COMPONENT
            )
          );
        }
        if (notification.attempts >= notification.maxAttempts) {
          return Err(
            ErrorFactory.business(
              'O limite de tentativas de entrega foi atingido',
              'notification_attempts_exhausted',
              COMPONENT
            )
          );
        }

        return Ok(
          await deliver(notification, notification.attempts + 1, tx)
        );
      });

      if (result.success) {
        publish(
          result.value.status === 'sent'
            ? 'notification.sent'
            : 'notification.retry_failed',
          result.value
        );
      }

      return result;
    },

    async cancel(
      id: string
    ): Promise<Result<NotificationResponseDTO, AppError>> {
      const result = await withTransaction(async (tx) => {
        const notification = await notifications.findByIdForUpdate(id, tx);
        if (!notification) {
          return Err(
            ErrorFactory.notFound(
              'Notificação não encontrada',
              'Notification',
              id,
              COMPONENT
            )
          );
        }
        if (notification.status === 'cancelled') return Ok(notification);
        if (notification.status !== 'pending') {
          return Err(
            ErrorFactory.business(
              'Só é possível cancelar notificações pendentes',
              'notification_not_cancellable',
              COMPONENT
            )
          );
        }

        const updated = await notifications.updateState(
          id,
          {
            status: 'cancelled',
            attempts: notification.attempts,
            cancelledAt: new Date(),
          },
          tx
        );
        if (!updated) {
          return Err(
            ErrorFactory.notFound(
              'Notificação não encontrada',
              'Notification',
              id,
              COMPONENT
            )
          );
        }
        return Ok(updated);
      });

      if (result.success) {
        publish('notification.cancelled', result.value);
      }
      return result;
    },

    async listDeliveries(
      id: string,
      params: PaginationParams
    ): Promise<Result<Awaited<ReturnType<INotificationRepository['listDeliveries']>>, AppError>> {
      const notification = await notifications.findById(id);
      if (!notification) {
        return Err(
          ErrorFactory.notFound(
            'Notificação não encontrada',
            'Notification',
            id,
            COMPONENT
          )
        );
      }
      return Ok(await notifications.listDeliveries(id, params));
    },
  };
};
