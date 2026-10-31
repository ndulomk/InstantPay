import type { AppError, Result } from '@instantpay/utils';
import type {
  CreateWebhookEventDTO,
  WebhookEventResponseDTO,
} from '../dtos/webhook.dto.js';

export interface IWebhookEventRepository {
  create(data: CreateWebhookEventDTO): Promise<WebhookEventResponseDTO>;
  findByEventId(
    provider: string,
    eventId: string
  ): Promise<WebhookEventResponseDTO | null>;
}

export interface IWebhookService {
  handle(
    provider: string,
    payload: string,
    signature?: string | null
  ): Promise<Result<WebhookEventResponseDTO, AppError>>;
}
