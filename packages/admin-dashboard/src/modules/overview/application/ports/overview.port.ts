import type { AppError, Result } from '@instantpay/utils';
import type { AdminOverviewDTO } from '../dtos/overview.dto.js';

export interface IOverviewRepository {
  overview(): Promise<AdminOverviewDTO>;
}

export interface IOverviewService {
  getOverview(): Promise<Result<AdminOverviewDTO, AppError>>;
}
