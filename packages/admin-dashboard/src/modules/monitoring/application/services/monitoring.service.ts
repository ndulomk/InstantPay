import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type {
  IHealthCheckRepository,
  IMonitoringService,
  IServiceRepository,
} from '../ports/monitoring.port.js';
import type {
  CreateServiceDTO,
  HealthCheckListFilters,
  HealthCheckSummaryDTO,
  ServiceListFilters,
  ServiceResponseDTO,
  UpdateServiceDTO,
} from '../dtos/monitoring.dto.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import type { PaginationParams } from '../../../../shared/pagination/pagination.js';
import { isUniqueViolation } from '../../../../shared/db/transaction.js';

const COMPONENT = 'MonitoringService';

const checkService = async (
  service: ServiceResponseDTO
): Promise<{
  status: 'healthy' | 'unhealthy';
  statusCode: number | null;
  latencyMs: number;
  errorMessage: string | null;
}> => {
  const started = Date.now();
  const url = `${service.baseUrl}${service.healthPath}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(service.timeoutMs),
    });
    await response.text();

    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      statusCode: response.status,
      latencyMs: Date.now() - started,
      errorMessage: response.ok
        ? null
        : `O serviço respondeu com o estado HTTP ${response.status}`,
    };
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError');
    const cause =
      error instanceof Error &&
      error.cause instanceof Error &&
      error.cause.message !== error.message
        ? error.cause.message
        : null;

    return {
      status: 'unhealthy',
      statusCode: null,
      latencyMs: Date.now() - started,
      errorMessage: timedOut
        ? `Tempo limite de ${service.timeoutMs}ms excedido`
        : error instanceof Error
          ? cause
            ? `${error.message}: ${cause}`
            : error.message
          : 'Falha desconhecida ao contactar o serviço',
    };
  }
};

export const createMonitoringService = (
  services: IServiceRepository,
  checks: IHealthCheckRepository,
  eventBus: EventBus,
  defaultTimeoutMs: number
): IMonitoringService => {
  const publish = (
    type: string,
    service: ServiceResponseDTO
  ): void => {
    eventBus.publish({
      type,
      entityType: 'admin_services',
      aggregateId: service.id,
      operation: type === 'admin_service.created' ? 'INSERT' : 'UPDATE',
      payload: {
        name: service.name,
        baseUrl: service.baseUrl,
        isActive: service.isActive,
      },
    });
  };

  return {
    async createService(
      data: CreateServiceDTO
    ): Promise<Result<ServiceResponseDTO, AppError>> {
      const existing = await services.findByName(data.name);
      if (existing) {
        return Err(
          ErrorFactory.conflict(
            'Já existe um serviço com este nome',
            'name',
            data.name,
            COMPONENT
          )
        );
      }

      try {
        const service = await services.create({
          ...data,
          timeoutMs: data.timeoutMs ?? defaultTimeoutMs,
        });
        publish('admin_service.created', service);
        return Ok(service);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return Err(
            ErrorFactory.conflict(
              'Já existe um serviço com este nome',
              'name',
              data.name,
              COMPONENT
            )
          );
        }
        throw error;
      }
    },

    async getService(
      id: string
    ): Promise<Result<ServiceResponseDTO, AppError>> {
      const service = await services.findById(id);
      if (!service) {
        return Err(
          ErrorFactory.notFound(
            'Serviço não encontrado',
            'AdminService',
            id,
            COMPONENT
          )
        );
      }
      return Ok(service);
    },

    async listServices(
      params: PaginationParams,
      filters?: ServiceListFilters
    ): Promise<Result<Awaited<ReturnType<IServiceRepository['list']>>, AppError>> {
      return Ok(await services.list(params, filters));
    },

    async updateService(
      id: string,
      data: UpdateServiceDTO
    ): Promise<Result<ServiceResponseDTO, AppError>> {
      const existing = await services.findById(id);
      if (!existing) {
        return Err(
          ErrorFactory.notFound(
            'Serviço não encontrado',
            'AdminService',
            id,
            COMPONENT
          )
        );
      }

      if (data.name && data.name !== existing.name) {
        const duplicate = await services.findByName(data.name);
        if (duplicate) {
          return Err(
            ErrorFactory.conflict(
              'Já existe um serviço com este nome',
              'name',
              data.name,
              COMPONENT
            )
          );
        }
      }

      try {
        const updated = await services.update(id, data);
        if (!updated) {
          return Err(
            ErrorFactory.notFound(
              'Serviço não encontrado',
              'AdminService',
              id,
              COMPONENT
            )
          );
        }
        publish('admin_service.updated', updated);
        return Ok(updated);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return Err(
            ErrorFactory.conflict(
              'Já existe um serviço com este nome',
              'name',
              data.name ?? existing.name,
              COMPONENT
            )
          );
        }
        throw error;
      }
    },

    async setServiceActive(
      id: string,
      isActive: boolean
    ): Promise<Result<ServiceResponseDTO, AppError>> {
      const updated = await services.update(id, { isActive });
      if (!updated) {
        return Err(
          ErrorFactory.notFound(
            'Serviço não encontrado',
            'AdminService',
            id,
            COMPONENT
          )
        );
      }
      publish('admin_service.updated', updated);
      return Ok(updated);
    },

    async removeService(id: string): Promise<Result<void, AppError>> {
      const existing = await services.findById(id);
      if (!existing) {
        return Err(
          ErrorFactory.notFound(
            'Serviço não encontrado',
            'AdminService',
            id,
            COMPONENT
          )
        );
      }

      const removed = await services.remove(id);
      if (!removed) {
        return Err(
          ErrorFactory.notFound(
            'Serviço não encontrado',
            'AdminService',
            id,
            COMPONENT
          )
        );
      }

      eventBus.publish({
        type: 'admin_service.removed',
        entityType: 'admin_services',
        aggregateId: id,
        operation: 'DELETE',
        payload: { name: existing.name },
      });

      return Ok(undefined);
    },

    async runChecks(): Promise<Result<HealthCheckSummaryDTO, AppError>> {
      const active = await services.listActive();
      const checkedAt = new Date();

      const results = await Promise.all(
        active.map(async (service) => {
          const outcome = await checkService(service);
          return checks.create({
            serviceId: service.id,
            status: outcome.status,
            statusCode: outcome.statusCode,
            latencyMs: outcome.latencyMs,
            errorMessage: outcome.errorMessage,
            checkedAt,
          });
        })
      );

      const healthy = results.filter(
        (result) => result.status === 'healthy'
      ).length;

      eventBus.publish({
        type: 'admin_health.checked',
        entityType: 'admin_health_checks',
        aggregateId: checkedAt.toISOString(),
        operation: 'INSERT',
        payload: {
          total: results.length,
          healthy,
          unhealthy: results.length - healthy,
        },
      });

      return Ok({
        checkedAt,
        total: results.length,
        healthy,
        unhealthy: results.length - healthy,
        results,
      });
    },

    async listChecks(
      params: PaginationParams,
      filters?: HealthCheckListFilters
    ): Promise<Result<Awaited<ReturnType<IHealthCheckRepository['list']>>, AppError>> {
      if (filters?.serviceId) {
        const service = await services.findById(filters.serviceId);
        if (!service) {
          return Err(
            ErrorFactory.notFound(
              'Serviço não encontrado',
              'AdminService',
              filters.serviceId,
              COMPONENT
            )
          );
        }
      }
      return Ok(await checks.list(params, filters));
    },
  };
};
