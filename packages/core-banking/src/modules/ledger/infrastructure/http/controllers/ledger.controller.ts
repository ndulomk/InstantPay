import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { ILedgerService } from '../../../application/ports/ledger.port.js';
import {
  ledgerAccountParamSchema,
  ledgerTransactionParamSchema,
  listLedgerQuerySchema,
} from '../../../application/dtos/ledger.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'LedgerController';

export const createLedgerController = (service: ILedgerService) => ({
  list: handler(async (request: FastifyRequest) => {
    const parsed = validateWithZod(listLedgerQuerySchema, request.query, COMPONENT);
    if (!parsed.success) return parsed;

    return service.list(parsed.value, {
      accountId: parsed.value.accountId,
      transactionId: parsed.value.transactionId,
      entryType: parsed.value.entryType,
      from: parsed.value.from,
      to: parsed.value.to,
    });
  }),

  listByAccount: handler(
    async (
      request: FastifyRequest
    ) => {
      const params = validateWithZod(
        ledgerAccountParamSchema,
        request.params,
        COMPONENT
      );
      if (!params.success) return params;

      const query = validateWithZod(
        listLedgerQuerySchema,
        request.query,
        COMPONENT
      );
      if (!query.success) return query;

      return service.listByAccount(params.value.accountId, query.value, {
        entryType: query.value.entryType,
        from: query.value.from,
        to: query.value.to,
      });
    }
  ),

  listByTransaction: handler(
    async (
      request: FastifyRequest
    ) => {
      const params = validateWithZod(
        ledgerTransactionParamSchema,
        request.params,
        COMPONENT
      );
      if (!params.success) return params;

      const query = validateWithZod(
        listLedgerQuerySchema,
        request.query,
        COMPONENT
      );
      if (!query.success) return query;

      return service.listByTransaction(params.value.transactionId, query.value);
    }
  ),
});
