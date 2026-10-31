import type { AppError, Result } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type { DbExecutor } from '../../../../shared/db/transaction.js';
import type {
  CreateRefundDTO,
  CreateRefundRecordDTO,
  RefundResponseDTO,
  RefundStatus,
  UpdateRefundStatusDTO,
} from '../dtos/refund.dto.js';

export type RefundListFilters = {
  status?: RefundStatus;
};

export interface IRefundRepository {
  create(
    data: CreateRefundRecordDTO,
    tx?: DbExecutor
  ): Promise<RefundResponseDTO>;
  findById(id: string): Promise<RefundResponseDTO | null>;
  listByPayment(
    paymentId: string,
    params: PaginationParams,
    filters?: RefundListFilters
  ): Promise<ListResponse<RefundResponseDTO>>;
  sumPendingRefunds(paymentId: string, tx: DbExecutor): Promise<number>;
  failStaleProcessing(
    paymentId: string,
    olderThan: Date,
    tx: DbExecutor
  ): Promise<void>;
  updateStatus(
    id: string,
    data: UpdateRefundStatusDTO,
    tx?: DbExecutor
  ): Promise<RefundResponseDTO | null>;
}

export interface IRefundService {
  create(
    paymentId: string,
    data: CreateRefundDTO,
    actorId?: string | null,
    ipAddress?: string | null
  ): Promise<Result<RefundResponseDTO, AppError>>;
  getById(id: string): Promise<Result<RefundResponseDTO, AppError>>;
  list(
    paymentId: string,
    params: PaginationParams,
    filters?: RefundListFilters
  ): Promise<Result<ListResponse<RefundResponseDTO>, AppError>>;
}
