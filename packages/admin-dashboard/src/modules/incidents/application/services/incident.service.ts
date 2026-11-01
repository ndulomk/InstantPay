import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type {
  IIncidentRepository,
  IIncidentService,
} from '../ports/incident.port.js';
import type {
  ChangeIncidentStatusDTO,
  CreateIncidentDTO,
  IncidentListFilters,
  IncidentResponseDTO,
  UpdateIncidentDTO,
} from '../dtos/incident.dto.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import type { PaginationParams } from '../../../../shared/pagination/pagination.js';

const COMPONENT = 'IncidentService';

export const createIncidentService = (
  repository: IIncidentRepository,
  eventBus: EventBus
): IIncidentService => {
  const publish = (
    type: string,
    incident: IncidentResponseDTO
  ): void => {
    eventBus.publish({
      type,
      entityType: 'admin_incidents',
      aggregateId: incident.id,
      operation: type === 'admin_incident.created' ? 'INSERT' : 'UPDATE',
      payload: {
        severity: incident.severity,
        status: incident.status,
        serviceName: incident.serviceName,
      },
    });
  };

  return {
    async create(
      data: CreateIncidentDTO
    ): Promise<Result<IncidentResponseDTO, AppError>> {
      const incident = await repository.create(data);
      publish('admin_incident.created', incident);
      return Ok(incident);
    },

    async getById(
      id: string
    ): Promise<Result<IncidentResponseDTO, AppError>> {
      const incident = await repository.findById(id);
      if (!incident) {
        return Err(
          ErrorFactory.notFound(
            'Incidente não encontrado',
            'AdminIncident',
            id,
            COMPONENT
          )
        );
      }
      return Ok(incident);
    },

    async list(
      params: PaginationParams,
      filters?: IncidentListFilters
    ): Promise<Result<Awaited<ReturnType<IIncidentRepository['list']>>, AppError>> {
      return Ok(await repository.list(params, filters));
    },

    async update(
      id: string,
      data: UpdateIncidentDTO
    ): Promise<Result<IncidentResponseDTO, AppError>> {
      const existing = await repository.findById(id);
      if (!existing) {
        return Err(
          ErrorFactory.notFound(
            'Incidente não encontrado',
            'AdminIncident',
            id,
            COMPONENT
          )
        );
      }
      if (existing.status === 'resolved') {
        return Err(
          ErrorFactory.business(
            'Um incidente resolvido já não pode ser editado',
            'incident_resolved',
            COMPONENT
          )
        );
      }

      const updated = await repository.update(id, data);
      if (!updated) {
        return Err(
          ErrorFactory.notFound(
            'Incidente não encontrado',
            'AdminIncident',
            id,
            COMPONENT
          )
        );
      }
      publish('admin_incident.updated', updated);
      return Ok(updated);
    },

    async changeStatus(
      id: string,
      data: ChangeIncidentStatusDTO
    ): Promise<Result<IncidentResponseDTO, AppError>> {
      const existing = await repository.findById(id);
      if (!existing) {
        return Err(
          ErrorFactory.notFound(
            'Incidente não encontrado',
            'AdminIncident',
            id,
            COMPONENT
          )
        );
      }
      if (
        existing.status === 'resolved' &&
        data.status === 'resolved'
      ) {
        return Err(
          ErrorFactory.business(
            'O incidente já está resolvido',
            'incident_already_resolved',
            COMPONENT
          )
        );
      }

      const resolvedAt =
        data.status === 'resolved' ? new Date() : null;
      const updated = await repository.updateStatus(
        id,
        data,
        resolvedAt
      );
      if (!updated) {
        return Err(
          ErrorFactory.notFound(
            'Incidente não encontrado',
            'AdminIncident',
            id,
            COMPONENT
          )
        );
      }

      publish('admin_incident.status_changed', updated);
      return Ok(updated);
    },
  };
};
