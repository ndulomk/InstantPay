import { createHash } from 'node:crypto';
import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type {
  IFeatureFlagRepository,
  IFeatureFlagService,
} from '../ports/feature-flag.port.js';
import type {
  CreateFeatureFlagDTO,
  FeatureFlagListFilters,
  FeatureFlagResponseDTO,
  FlagEvaluationDTO,
  UpdateFeatureFlagDTO,
} from '../dtos/feature-flag.dto.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import type { PaginationParams } from '../../../../shared/pagination/pagination.js';
import { isUniqueViolation } from '../../../../shared/db/transaction.js';

const COMPONENT = 'FeatureFlagService';

const bucketFor = (key: string, subjectId: string): number => {
  const digest = createHash('sha256')
    .update(`${key}:${subjectId}`, 'utf8')
    .digest('hex');
  return Number.parseInt(digest.slice(0, 8), 16) % 100;
};

export const createFeatureFlagService = (
  repository: IFeatureFlagRepository,
  eventBus: EventBus
): IFeatureFlagService => {
  const publish = (
    type: string,
    flag: FeatureFlagResponseDTO
  ): void => {
    eventBus.publish({
      type,
      entityType: 'admin_feature_flags',
      aggregateId: flag.id,
      operation: type === 'admin_feature_flag.created'
        ? 'INSERT'
        : 'UPDATE',
      payload: {
        key: flag.key,
        isEnabled: flag.isEnabled,
        rolloutPercentage: flag.rolloutPercentage,
      },
    });
  };

  return {
    async create(
      data: CreateFeatureFlagDTO
    ): Promise<Result<FeatureFlagResponseDTO, AppError>> {
      const existing = await repository.findByKey(data.key);
      if (existing) {
        return Err(
          ErrorFactory.conflict(
            'Já existe uma feature flag com esta chave',
            'key',
            data.key,
            COMPONENT
          )
        );
      }

      try {
        const flag = await repository.create(data);
        publish('admin_feature_flag.created', flag);
        return Ok(flag);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return Err(
            ErrorFactory.conflict(
              'Já existe uma feature flag com esta chave',
              'key',
              data.key,
              COMPONENT
            )
          );
        }
        throw error;
      }
    },

    async getById(
      id: string
    ): Promise<Result<FeatureFlagResponseDTO, AppError>> {
      const flag = await repository.findById(id);
      if (!flag) {
        return Err(
          ErrorFactory.notFound(
            'Feature flag não encontrada',
            'AdminFeatureFlag',
            id,
            COMPONENT
          )
        );
      }
      return Ok(flag);
    },

    async list(
      params: PaginationParams,
      filters?: FeatureFlagListFilters
    ): Promise<Result<Awaited<ReturnType<IFeatureFlagRepository['list']>>, AppError>> {
      return Ok(await repository.list(params, filters));
    },

    async update(
      id: string,
      data: UpdateFeatureFlagDTO
    ): Promise<Result<FeatureFlagResponseDTO, AppError>> {
      const existing = await repository.findById(id);
      if (!existing) {
        return Err(
          ErrorFactory.notFound(
            'Feature flag não encontrada',
            'AdminFeatureFlag',
            id,
            COMPONENT
          )
        );
      }

      if (data.key && data.key !== existing.key) {
        const duplicate = await repository.findByKey(data.key);
        if (duplicate) {
          return Err(
            ErrorFactory.conflict(
              'Já existe uma feature flag com esta chave',
              'key',
              data.key,
              COMPONENT
            )
          );
        }
      }

      try {
        const updated = await repository.update(id, data);
        if (!updated) {
          return Err(
            ErrorFactory.notFound(
              'Feature flag não encontrada',
              'AdminFeatureFlag',
              id,
              COMPONENT
            )
          );
        }
        publish('admin_feature_flag.updated', updated);
        return Ok(updated);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return Err(
            ErrorFactory.conflict(
              'Já existe uma feature flag com esta chave',
              'key',
              data.key ?? existing.key,
              COMPONENT
            )
          );
        }
        throw error;
      }
    },

    async setEnabled(
      id: string,
      isEnabled: boolean
    ): Promise<Result<FeatureFlagResponseDTO, AppError>> {
      const updated = await repository.update(id, { isEnabled });
      if (!updated) {
        return Err(
          ErrorFactory.notFound(
            'Feature flag não encontrada',
            'AdminFeatureFlag',
            id,
            COMPONENT
          )
        );
      }
      publish('admin_feature_flag.updated', updated);
      return Ok(updated);
    },

    async evaluate(
      key: string,
      subjectId: string
    ): Promise<Result<FlagEvaluationDTO, AppError>> {
      const flag = await repository.findByKey(key);
      if (!flag) {
        return Err(
          ErrorFactory.notFound(
            'Feature flag não encontrada',
            'AdminFeatureFlag',
            key,
            COMPONENT
          )
        );
      }

      if (!flag.isEnabled) {
        return Ok({
          key: flag.key,
          enabled: false,
          rolloutPercentage: flag.rolloutPercentage,
          bucket: null,
          reason: 'flag_disabled',
        });
      }

      if (flag.rolloutPercentage >= 100) {
        return Ok({
          key: flag.key,
          enabled: true,
          rolloutPercentage: flag.rolloutPercentage,
          bucket: null,
          reason: 'fully_rolled_out',
        });
      }

      const bucket = bucketFor(flag.key, subjectId);
      return Ok({
        key: flag.key,
        enabled: bucket < flag.rolloutPercentage,
        rolloutPercentage: flag.rolloutPercentage,
        bucket,
        reason: 'rollout',
      });
    },
  };
};
