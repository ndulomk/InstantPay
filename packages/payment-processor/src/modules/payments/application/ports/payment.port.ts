import type { AppError, Result } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type { DbExecutor } from '../../../../shared/db/transaction.js';
import type {
  CreatePaymentDTO,
  CreatePaymentRecordDTO,
  PaymentMethod,
  PaymentResponseDTO,
  PaymentStatus,
  UpdatePaymentStatusDTO,
} from '../dtos/payment.dto.js';

export type PaymentListFilters = {
  status?: PaymentStatus;
  provider?: string;
  method?: PaymentMethod;
  merchantReference?: string;
  from?: Date;
  to?: Date;
};

export interface IPaymentRepository {
  create(data: CreatePaymentRecordDTO): Promise<PaymentResponseDTO>;
  findById(id: string): Promise<PaymentResponseDTO | null>;
  findByIdForUpdate(
    id: string,
    tx: DbExecutor
  ): Promise<PaymentResponseDTO | null>;
  findByReference(reference: string): Promise<PaymentResponseDTO | null>;
  findByIdempotencyKey(
    key: string
  ): Promise<PaymentResponseDTO | null>;
  findByProviderReference(
    provider: string,
    providerReference: string
  ): Promise<PaymentResponseDTO | null>;
  list(
    params: PaginationParams,
    filters?: PaymentListFilters
  ): Promise<ListResponse<PaymentResponseDTO>>;
  updateStatus(
    id: string,
    data: UpdatePaymentStatusDTO,
    tx?: DbExecutor
  ): Promise<PaymentResponseDTO | null>;
  applyRefund(
    id: string,
    amount: number,
    tx: DbExecutor
  ): Promise<PaymentResponseDTO | null>;
}

export interface IPaymentService {
  create(
    data: CreatePaymentDTO,
    actorId?: string | null,
    ipAddress?: string | null
  ): Promise<Result<PaymentResponseDTO, AppError>>;
  getById(id: string): Promise<Result<PaymentResponseDTO, AppError>>;
  getByReference(
    reference: string
  ): Promise<Result<PaymentResponseDTO, AppError>>;
  list(
    params: PaginationParams,
    filters?: PaymentListFilters
  ): Promise<Result<ListResponse<PaymentResponseDTO>, AppError>>;
  cancel(
    id: string,
    actorId?: string | null,
    ipAddress?: string | null
  ): Promise<Result<PaymentResponseDTO, AppError>>;
}

export type ChargeStatus = 'succeeded' | 'requires_action' | 'failed';

export type CreateChargeInput = {
  reference: string;
  amount: number;
  currencyCode: string;
  method: PaymentMethod;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
};

export type ChargeResult = {
  providerReference: string;
  status: ChargeStatus;
  failureCode?: string | null;
  failureMessage?: string | null;
  authorizedAt?: Date | null;
  capturedAt?: Date | null;
};

export type RefundInput = {
  providerReference: string;
  reference: string;
  amount: number;
  currencyCode: string;
  reason?: string | null;
};

export type RefundResult = {
  providerRefundReference: string;
  status: 'succeeded' | 'failed';
  failureCode?: string | null;
  failureMessage?: string | null;
};

export type WebhookEventType =
  | 'payment.succeeded'
  | 'payment.requires_action'
  | 'payment.failed';

export type WebhookEventDTO = {
  eventId: string;
  type: WebhookEventType;
  providerReference: string;
  failureCode?: string | null;
  failureMessage?: string | null;
};

export interface IPaymentProvider {
  readonly name: string;
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  refund(input: RefundInput): Promise<RefundResult>;
  verifyWebhook(payload: string, signature?: string | null): boolean;
  parseWebhook(payload: string): WebhookEventDTO;
}

export type PaymentProviderRegistry = ReadonlyMap<string, IPaymentProvider>;
