import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { INotificationService } from '../../../application/ports/notification.port.js';
import {
  createNotificationSchema,
  listDeliveriesQuerySchema,
  listNotificationsQuerySchema,
  notificationIdSchema,
  notificationIdempotencySchema,
} from '../../../application/dtos/notification.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'NotificationController';

const readIdempotencyKey = (
  request: FastifyRequest
): string | undefined => {
  const raw = request.headers['idempotency-key'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
};

export const createNotificationController = (
  service: INotificationService
) => {
  const parseId = (request: FastifyRequest) =>
    validateWithZod(notificationIdSchema, request.params, COMPONENT);

  return {
    create: handler(async (request: FastifyRequest, reply) => {
      const parsed = validateWithZod(
        createNotificationSchema,
        request.body,
        COMPONENT
      );
      if (!parsed.success) return parsed;

      const key = readIdempotencyKey(request);
      if (key) {
        const validKey = validateWithZod(
          notificationIdempotencySchema,
          key,
          COMPONENT
        );
        if (!validKey.success) return validKey;
      }

      const result = await service.create(parsed.value, key);
      if (result.success) reply.code(201);
      return result;
    }),

    list: handler(async (request: FastifyRequest) => {
      const parsed = validateWithZod(
        listNotificationsQuerySchema,
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

    retry: handler(async (request: FastifyRequest) => {
      const parsed = parseId(request);
      if (!parsed.success) return parsed;
      return service.retry(parsed.value.id);
    }),

    cancel: handler(async (request: FastifyRequest) => {
      const parsed = parseId(request);
      if (!parsed.success) return parsed;
      return service.cancel(parsed.value.id);
    }),

    listDeliveries: handler(async (request: FastifyRequest) => {
      const params = parseId(request);
      if (!params.success) return params;

      const query = validateWithZod(
        listDeliveriesQuerySchema,
        request.query,
        COMPONENT
      );
      if (!query.success) return query;

      return service.listDeliveries(params.value.id, query.value);
    }),
  };
};
