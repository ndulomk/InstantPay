import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IRefundService } from '../../../application/ports/refund.port.js';
import {
  createRefundSchema,
  listRefundsQuerySchema,
  refundIdSchema,
} from '../../../application/dtos/refund.dto.js';
import { paymentIdSchema } from '../../../../payments/application/dtos/payment.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'RefundController';

const ipAddress = (request: FastifyRequest): string => {
  const forwarded = request.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(',')[0]?.trim() ?? request.ip;
};

export const createRefundController = (service: IRefundService) => ({
  create: handler(async (request: FastifyRequest, reply) => {
    const params = validateWithZod(
      paymentIdSchema,
      request.params,
      COMPONENT
    );
    if (!params.success) return params;

    const body = validateWithZod(
      createRefundSchema,
      request.body,
      COMPONENT
    );
    if (!body.success) return body;

    const result = await service.create(
      params.value.id,
      body.value,
      undefined,
      ipAddress(request)
    );
    if (result.success) reply.code(201);
    return result;
  }),

  list: handler(async (request: FastifyRequest) => {
    const params = validateWithZod(
      paymentIdSchema,
      request.params,
      COMPONENT
    );
    if (!params.success) return params;

    const query = validateWithZod(
      listRefundsQuerySchema,
      request.query,
      COMPONENT
    );
    if (!query.success) return query;

    const { cursor, pageSize, status } = query.value;
    return service.list(
      params.value.id,
      { cursor, pageSize },
      { status }
    );
  }),

  getById: handler(async (request: FastifyRequest) => {
    const params = validateWithZod(
      refundIdSchema,
      request.params,
      COMPONENT
    );
    if (!params.success) return params;
    return service.getById(params.value.id);
  }),
});
