import type { AppError, Result } from '@instantpay/utils';
import type {
  DiscrepancyTotalsDTO,
  ReconciliationSummaryDTO,
  StatementReportDTO,
  StatementTotalsDTO,
  SummaryQueryDTO,
} from '../dtos/report.dto.js';

export interface IReportRepository {
  summary(filters?: SummaryQueryDTO): Promise<{
    statements: StatementTotalsDTO;
    discrepancies: DiscrepancyTotalsDTO;
  }>;
  statementBreakdown(statementId: string): Promise<{
    entries: StatementReportDTO['entries'];
    discrepancies: DiscrepancyTotalsDTO;
  }>;
}

export interface IReportService {
  getSummary(
    filters?: SummaryQueryDTO
  ): Promise<Result<ReconciliationSummaryDTO, AppError>>;
  getStatementReport(
    statementId: string
  ): Promise<Result<StatementReportDTO, AppError>>;
}
