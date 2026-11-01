import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type {
  IRuleRepository,
  IRuleService,
  RuleListFilters,
} from '../ports/rule.port.js';
import type {
  CreateRuleDTO,
  RuleResponseDTO,
  UpdateRuleDTO,
} from '../dtos/rule.dto.js';
import { validateRuleCondition } from './rule-evaluator.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import type { PaginationParams } from '../../../../shared/pagination/pagination.js';
import { isUniqueViolation } from '../../../../shared/db/transaction.js';

const COMPONENT = 'RuleService';

const conditionError = (data: CreateRuleDTO): string | null =>
  validateRuleCondition(data.field, data.operator, data.value);

export const createRuleService = (
  repository: IRuleRepository,
  eventBus: EventBus
): IRuleService => {
  const publish = (type: string, rule: RuleResponseDTO): void => {
    eventBus.publish({
      type,
      entityType: 'fraud_rules',
      aggregateId: rule.id,
      operation: type === 'fraud_rule.created' ? 'INSERT' : 'UPDATE',
      payload: {
        code: rule.code,
        name: rule.name,
        field: rule.field,
        operator: rule.operator,
        value: rule.value,
        score: rule.score,
        severity: rule.severity,
        isActive: rule.isActive,
        priority: rule.priority,
      },
    });
  };

  return {
    async create(
      data: CreateRuleDTO
    ): Promise<Result<RuleResponseDTO, AppError>> {
      const error = conditionError(data);
      if (error) {
        return Err(
          ErrorFactory.validation(
            error,
            [{ field: 'value', message: error, rule: 'invalid_rule' }],
            COMPONENT
          )
        );
      }

      const existing = await repository.findByCode(data.code);
      if (existing) {
        return Err(
          ErrorFactory.conflict(
            'Já existe uma regra com este código',
            'code',
            data.code,
            COMPONENT
          )
        );
      }

      try {
        const rule = await repository.create(data);
        publish('fraud_rule.created', rule);
        return Ok(rule);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return Err(
            ErrorFactory.conflict(
              'Já existe uma regra com este código',
              'code',
              data.code,
              COMPONENT
            )
          );
        }
        throw error;
      }
    },

    async getById(
      id: string
    ): Promise<Result<RuleResponseDTO, AppError>> {
      const rule = await repository.findById(id);
      if (!rule) {
        return Err(
          ErrorFactory.notFound(
            'Regra não encontrada',
            'FraudRule',
            id,
            COMPONENT
          )
        );
      }
      return Ok(rule);
    },

    async list(
      params: PaginationParams,
      filters?: RuleListFilters
    ): Promise<Result<Awaited<ReturnType<IRuleRepository['list']>>, AppError>> {
      return Ok(await repository.list(params, filters));
    },

    async update(
      id: string,
      data: UpdateRuleDTO
    ): Promise<Result<RuleResponseDTO, AppError>> {
      const existing = await repository.findById(id);
      if (!existing) {
        return Err(
          ErrorFactory.notFound(
            'Regra não encontrada',
            'FraudRule',
            id,
            COMPONENT
          )
        );
      }

      const merged: CreateRuleDTO = {
        code: data.code ?? existing.code,
        name: data.name ?? existing.name,
        description:
          data.description !== undefined
            ? data.description
            : existing.description ?? undefined,
        field: data.field ?? existing.field,
        operator: data.operator ?? existing.operator,
        value: data.value !== undefined ? data.value : existing.value,
        score: data.score ?? existing.score,
        severity: data.severity ?? existing.severity,
        isActive: data.isActive ?? existing.isActive,
        priority: data.priority ?? existing.priority,
      };

      const error = conditionError(merged);
      if (error) {
        return Err(
          ErrorFactory.validation(
            error,
            [{ field: 'value', message: error, rule: 'invalid_rule' }],
            COMPONENT
          )
        );
      }

      if (merged.code !== existing.code) {
        const duplicate = await repository.findByCode(merged.code);
        if (duplicate) {
          return Err(
            ErrorFactory.conflict(
              'Já existe uma regra com este código',
              'code',
              merged.code,
              COMPONENT
            )
          );
        }
      }

      try {
        const updated = await repository.update(id, merged);
        if (!updated) {
          return Err(
            ErrorFactory.notFound(
              'Regra não encontrada',
              'FraudRule',
              id,
              COMPONENT
            )
          );
        }
        publish('fraud_rule.updated', updated);
        return Ok(updated);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return Err(
            ErrorFactory.conflict(
              'Já existe uma regra com este código',
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
    ): Promise<Result<RuleResponseDTO, AppError>> {
      const existing = await repository.findById(id);
      if (!existing) {
        return Err(
          ErrorFactory.notFound(
            'Regra não encontrada',
            'FraudRule',
            id,
            COMPONENT
          )
        );
      }

      const updated = await repository.update(id, {
        code: existing.code,
        name: existing.name,
        description: existing.description ?? undefined,
        field: existing.field,
        operator: existing.operator,
        value: existing.value,
        score: existing.score,
        severity: existing.severity,
        isActive,
        priority: existing.priority,
      });

      if (!updated) {
        return Err(
          ErrorFactory.notFound(
            'Regra não encontrada',
            'FraudRule',
            id,
            COMPONENT
          )
        );
      }

      publish(
        isActive ? 'fraud_rule.activated' : 'fraud_rule.deactivated',
        updated
      );
      return Ok(updated);
    },
  };
};
