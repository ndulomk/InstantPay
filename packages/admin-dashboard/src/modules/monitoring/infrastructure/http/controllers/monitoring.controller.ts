import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IMonitoringService } from '../../../application/ports/monitoring.port.js';
import {
  createServiceSchema,
  listHealthChecksQuerySchema,
  listServicesQuerySchema,
  serviceActiveSchema,
  serviceIdSchema,
  updateServiceSchema,
} from '../../../application/dtos/monitoring.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'MonitoringController';

const parseId = (request: FastifyRequest) =>
  validateWithZod(serviceIdSchema, request.params, COMPONENT);

export const createMonitoringController = (
  service: IMonitoringService
) => ({
  createService: handler(async (request: FastifyRequest, reply) => {
    const parsed = validateWithZod(
      createServiceSchema,
      request.body,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const result = await service.createService(parsed.value);
    if (result.success) reply.code(201);
    return result;
  }),

  listServices: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      listServicesQuerySchema,
      request.query,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const { cursor, pageSize, ...filters } = parsed.value;
    return service.listServices({ cursor, pageSize }, filters);
  }),

  getService: handler(async (request: FastifyRequest) => {
    const parsed = parseId(request);
    if (!parsed.success) return parsed;
    return service.getService(parsed.value.id);
  }),

  updateService: handler(async (request: FastifyRequest) => {
    const params = parseId(request);
    if (!params.success) return params;

    const body = validateWithZod(
      updateServiceSchema,
      request.body,
      COMPONENT
    );
    if (!body.success) return body;

    return service.updateService(params.value.id, body.value);
  }),

  setServiceActive: handler(async (request: FastifyRequest) => {
    const params = parseId(request);
    if (!params.success) return params;

    const body = validateWithZod(
      serviceActiveSchema,
      request.body,
      COMPONENT
    );
    if (!body.success) return body;

    return service.setServiceActive(
      params.value.id,
      body.value.isActive
    );
  }),

  removeService: handler(async (request: FastifyRequest, reply) => {
    const params = parseId(request);
    if (!params.success) return params;

    const result = await service.removeService(params.value.id);
    if (result.success) reply.code(204).send();
    return result;
  }),

  runChecks: handler(async (_request: FastifyRequest, reply) => {
    const result = await service.runChecks();
    if (result.success) reply.code(201);
    return result;
  }),

  listChecks: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      listHealthChecksQuerySchema,
      request.query,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const { cursor, pageSize, ...filters } = parsed.value;
    return service.listChecks({ cursor, pageSize }, filters);
  }),
});
