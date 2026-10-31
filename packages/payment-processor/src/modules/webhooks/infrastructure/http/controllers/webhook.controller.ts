import { handler } from '@instantpay/utils';
import type { FastifyRequest } from 'fastify';
import type { IWebhookService } from '../../../application/ports/webhook.port.js';
import { webhookProviderSchema } from '../../../application/dtos/webhook.dto.js';
import { validateWithZod } from '../../../../../shared/validation/validate-with-zod.js';

const COMPONENT = 'WebhookController';

export const createWebhookController = (service: IWebhookService) => ({
  handle: handler(async (request: FastifyRequest) => {
    const params = validateWithZod(
      webhookProviderSchema,
      request.params,
      COMPONENT
    );
    if (!params.success) return params;

    const payload = request.rawBody;
    if (!payload) {
      return {
        success: false as const,
        error: {
          type: 'VALIDATION_ERROR' as const,
          statusCode: 422,
          message: 'Corpo do webhook em falta',
          timestamp: new Date().toISOString(),
          component: COMPONENT,
          errors: [
            {
              field: 'body',
              message: 'Corpo do webhook em falta',
              rule: 'required',
            },
          ],
        },
      };
    }

    const header = request.headers['x-webhook-signature'];
    const signature = Array.isArray(header) ? header[0] : header;

    return service.handle(params.value.provider, payload, signature);
  }),
});
