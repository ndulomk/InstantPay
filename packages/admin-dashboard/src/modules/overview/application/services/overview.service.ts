import { Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type {
  IOverviewRepository,
  IOverviewService,
} from '../ports/overview.port.js';
import type { AdminOverviewDTO } from '../dtos/overview.dto.js';

export const createOverviewService = (
  repository: IOverviewRepository
): IOverviewService => ({
  async getOverview(): Promise<Result<AdminOverviewDTO, AppError>> {
    return Ok(await repository.overview());
  },
});
