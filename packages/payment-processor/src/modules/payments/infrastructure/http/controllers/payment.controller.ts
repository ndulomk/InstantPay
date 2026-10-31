import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IPaymentService } from '../../../application/ports/payment.port.js';
import {
  createPaymentSchema,
  listPaymentsQuerySchema,
  paymentIdSchema,
  paymentReferenceSchema,
} from '../../../application/dtos/payment.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'PaymentController';

const idempotencyKey = (request: FastifyRequest): string | undefined => {
  const header = request.headers['idempotency-key'];
  return Array.isArray(header) ? header[0] : header;
};

const ipAddress = (request: FastifyRequest): string => {
  const forwarded = request.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(',')[0]?.trim() ?? request.ip;
};

export const createPaymentController = (service: IPaymentService) => ({
  create: handler(async (request: FastifyRequest, reply) => {
    const parsed = validateWithZod(
      createPaymentSchema,
      request.body,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const result = await service.create(
      { ...parsed.value, idempotencyKey: idempotencyKey(request) },
      undefined,
      ipAddress(request)
    );
    if (result.success) reply.code(201);
    return result;
  }),

  list: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      listPaymentsQuerySchema,
      request.query,
      COMPONENT
    );
    if (!parsed.success) return parsed;

    const { cursor, pageSize, ...filters } = parsed.value;
    return service.list({ cursor, pageSize }, filters);
  }),

  getById: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      paymentIdSchema,
      request.params,
      COMPONENT
    );
    if (!parsed.success) return parsed;
    return service.getById(parsed.value.id);
  }),

  getByReference: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      paymentReferenceSchema,
      request.params,
      COMPONENT
    );
    if (!parsed.success) return parsed;
    return service.getByReference(parsed.value.reference);
  }),

  cancel: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(
      paymentIdSchema,
      request.params,
      COMPONENT
    );
    if (!parsed.success) return parsed;
    return service.cancel(parsed.value.id, undefined, ipAddress(request));
  }),
});
