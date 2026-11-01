import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IIncidentService } from '../../../application/ports/incident.port.js';
import {
  changeIncidentStatusSchema,
  createIncidentSchema,
  incidentIdSchema,
  listIncidentsQuerySchema,
  updateIncidentSchema,
} from '../../../application/dtos/incident.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'IncidentController';

const parseId = (request: FastifyRequest) =>
  validateWithZod(incidentIdSchema, request.params, COMPONENT);

export const createIncidentController = (
  service: IIncidentService
) => ({
  create: handler(async (request: FastifyRequest, reply) => {
    const parsed = validateWithZod(
      createIncidentSchema,
      request.body,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const result = await service.create(parsed.value);
    if (result.success) reply.code(201);
    return result;
  }),

  list: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      listIncidentsQuerySchema,
      request.query,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const { cursor, pageSize, ...filters } = parsed.value;
    return service.list({ cursor, pageSize }, filters);
  }),

  getById: handler(async (request: FastifyRequest) => {
    const parsed = parseId(request);
    if (!parsed.success) return parsed;
    return service.getById(parsed.value.id);
  }),

  update: handler(async (request: FastifyRequest) => {
    const params = parseId(request);
    if (!params.success) return params;

    const body = validateWithZod(
      updateIncidentSchema,
      request.body,
      COMPONENT
    );
    if (!body.success) return body;

    return service.update(params.value.id, body.value);
  }),

  changeStatus: handler(async (request: FastifyRequest) => {
    const params = parseId(request);
    if (!params.success) return params;

    const body = validateWithZod(
      changeIncidentStatusSchema,
      request.body,
      COMPONENT
    );
    if (!body.success) return body;

    return service.changeStatus(params.value.id, body.value);
  }),
});
