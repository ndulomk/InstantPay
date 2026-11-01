import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type {
  ITemplateRepository,
  ITemplateService,
  TemplateListFilters,
} from '../ports/template.port.js';
import type {
  CreateTemplateDTO,
  TemplateResponseDTO,
  UpdateTemplateDTO,
} from '../dtos/template.dto.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import type { PaginationParams } from '../../../../shared/pagination/pagination.js';
import { isUniqueViolation } from '../../../../shared/db/transaction.js';
import {
  validateTemplateContent,
  type TemplateContentError,
} from './template-renderer.js';

const COMPONENT = 'TemplateService';

const contentError = (
  data: Pick<CreateTemplateDTO, 'channel' | 'subject' | 'body'> & {
    variables: string[];
  },
  component = COMPONENT
): AppError | null => {
  const errors: TemplateContentError[] = validateTemplateContent({
    channel: data.channel,
    subject: data.subject ?? null,
    body: data.body,
    variables: data.variables,
  });

  if (errors.length === 0) return null;

  return ErrorFactory.validation(
    'Conteúdo do template inválido',
    errors.map((error) => ({
      field: error.field,
      message: error.message,
      rule: 'invalid_template',
    })),
    component
  );
};

export const createTemplateService = (
  repository: ITemplateRepository,
  eventBus: EventBus
): ITemplateService => {
  const publish = (
    type: string,
    operation: 'INSERT' | 'UPDATE',
    template: TemplateResponseDTO
  ): void => {
    eventBus.publish({
      type,
      entityType: 'notification_templates',
      aggregateId: template.id,
      operation,
      payload: {
        code: template.code,
        channel: template.channel,
        isActive: template.isActive,
        locale: template.locale,
      },
    });
  };

  return {
    async create(
      data: CreateTemplateDTO
    ): Promise<Result<TemplateResponseDTO, AppError>> {
      const normalized: CreateTemplateDTO = {
        ...data,
        variables: data.variables ?? [],
      };

      const invalid = contentError({
        channel: normalized.channel,
        subject: normalized.subject,
        body: normalized.body,
        variables: normalized.variables ?? [],
      });
      if (invalid) return Err(invalid);

      const existing = await repository.findByCode(normalized.code);
      if (existing) {
        return Err(
          ErrorFactory.conflict(
            'Já existe um template com este código',
            'code',
            normalized.code,
            COMPONENT
          )
        );
      }

      try {
        const template = await repository.create(normalized);
        publish('notification_template.created', 'INSERT', template);
        return Ok(template);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return Err(
            ErrorFactory.conflict(
              'Já existe um template com este código',
              'code',
              normalized.code,
              COMPONENT
            )
          );
        }
        throw error;
      }
    },

    async getById(
      id: string
    ): Promise<Result<TemplateResponseDTO, AppError>> {
      const template = await repository.findById(id);
      if (!template) {
        return Err(
          ErrorFactory.notFound(
            'Template não encontrado',
            'NotificationTemplate',
            id,
            COMPONENT
          )
        );
      }
      return Ok(template);
    },

    async list(
      params: PaginationParams,
      filters?: TemplateListFilters
    ): Promise<Result<Awaited<ReturnType<ITemplateRepository['list']>>, AppError>> {
      return Ok(await repository.list(params, filters));
    },

    async update(
      id: string,
      data: UpdateTemplateDTO
    ): Promise<Result<TemplateResponseDTO, AppError>> {
      const existing = await repository.findById(id);
      if (!existing) {
        return Err(
          ErrorFactory.notFound(
            'Template não encontrado',
            'NotificationTemplate',
            id,
            COMPONENT
          )
        );
      }

      const merged: CreateTemplateDTO = {
        code: data.code ?? existing.code,
        name: data.name ?? existing.name,
        channel: data.channel ?? existing.channel,
        subject:
          data.subject !== undefined
            ? data.subject ?? undefined
            : existing.subject ?? undefined,
        body: data.body ?? existing.body,
        variables: data.variables ?? existing.variables,
        locale: data.locale ?? existing.locale,
        metadata:
          data.metadata !== undefined
            ? data.metadata ?? undefined
            : existing.metadata ?? undefined,
      };

      const invalid = contentError({
        channel: merged.channel,
        subject: merged.subject,
        body: merged.body,
        variables: merged.variables ?? [],
      });
      if (invalid) return Err(invalid);

      if (merged.code !== existing.code) {
        const duplicate = await repository.findByCode(merged.code);
        if (duplicate) {
          return Err(
            ErrorFactory.conflict(
              'Já existe um template com este código',
              'code',
              merged.code,
              COMPONENT
            )
          );
        }
      }

      try {
        const updated = await repository.update(id, {
          ...data,
          subject:
            data.subject !== undefined ? data.subject : existing.subject,
        });
        if (!updated) {
          return Err(
            ErrorFactory.notFound(
              'Template não encontrado',
              'NotificationTemplate',
              id,
              COMPONENT
            )
          );
        }
        publish('notification_template.updated', 'UPDATE', updated);
        return Ok(updated);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return Err(
            ErrorFactory.conflict(
              'Já existe um template com este código',
              'code',
              merged.code,
              COMPONENT
            )
          );
        }
        throw error;
      }
    },

    async setActive(
      id: string,
      isActive: boolean
    ): Promise<Result<TemplateResponseDTO, AppError>> {
      const existing = await repository.findById(id);
      if (!existing) {
        return Err(
          ErrorFactory.notFound(
            'Template não encontrado',
            'NotificationTemplate',
            id,
            COMPONENT
          )
        );
      }

      const updated = await repository.update(id, { isActive });
      if (!updated) {
        return Err(
          ErrorFactory.notFound(
            'Template não encontrado',
            'NotificationTemplate',
            id,
            COMPONENT
          )
        );
      }
      publish('notification_template.updated', 'UPDATE', updated);
      return Ok(updated);
    },
  };
};
