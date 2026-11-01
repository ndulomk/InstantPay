import type { AppError, Result } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type { DbExecutor } from '../../../../shared/db/transaction.js';
import type { NotificationChannel } from '../../../templates/application/dtos/template.dto.js';
import type {
  CreateDeliveryDTO,
  CreateNotificationDTO,
  CreateNotificationRecordDTO,
  DeliveryResponseDTO,
  NotificationListFilters,
  NotificationResponseDTO,
  NotificationStatePatch,
} from '../dtos/notification.dto.js';

export interface INotificationRepository {
  create(
    data: CreateNotificationRecordDTO,
    tx?: DbExecutor
  ): Promise<NotificationResponseDTO>;
  findById(
    id: string,
    tx?: DbExecutor
  ): Promise<NotificationResponseDTO | null>;
  findByIdForUpdate(
    id: string,
    tx: DbExecutor
  ): Promise<NotificationResponseDTO | null>;
  findByIdempotencyKey(
    key: string
  ): Promise<NotificationResponseDTO | null>;
  list(
    params: PaginationParams,
    filters?: NotificationListFilters
  ): Promise<ListResponse<NotificationResponseDTO>>;
  updateState(
    id: string,
    patch: NotificationStatePatch,
    tx?: DbExecutor
  ): Promise<NotificationResponseDTO | null>;
  createDelivery(
    data: CreateDeliveryDTO,
    tx?: DbExecutor
  ): Promise<DeliveryResponseDTO>;
  listDeliveries(
    notificationId: string,
    params: PaginationParams
  ): Promise<ListResponse<DeliveryResponseDTO>>;
}

export interface INotificationService {
  create(
    data: CreateNotificationDTO,
    idempotencyKey?: string
  ): Promise<Result<NotificationResponseDTO, AppError>>;
  getById(
    id: string
  ): Promise<Result<NotificationResponseDTO, AppError>>;
  list(
    params: PaginationParams,
    filters?: NotificationListFilters
  ): Promise<
    Result<ListResponse<NotificationResponseDTO>, AppError>
  >;
  retry(
    id: string
  ): Promise<Result<NotificationResponseDTO, AppError>>;
  cancel(
    id: string
  ): Promise<Result<NotificationResponseDTO, AppError>>;
  listDeliveries(
    id: string,
    params: PaginationParams
  ): Promise<Result<ListResponse<DeliveryResponseDTO>, AppError>>;
}

export type ProviderSendInput = {
  notificationId: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string | null;
  body: string;
  attempt: number;
};

export type ProviderSendResult = {
  providerMessageId: string;
};

export interface NotificationProvider {
  name: string;
  channel: NotificationChannel;
  send(input: ProviderSendInput): Promise<ProviderSendResult>;
}

export interface ProviderRegistry {
  get(channel: NotificationChannel): NotificationProvider;
}
