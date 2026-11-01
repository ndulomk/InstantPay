import { Err, ErrorFactory, Ok } from '@instantpay/utils';
import type { AppError, Result } from '@instantpay/utils';
import type {
  IReportRepository,
  IReportService,
} from '../ports/report.port.js';
import type {
  ReconciliationSummaryDTO,
  StatementReportDTO,
  SummaryQueryDTO,
} from '../dtos/report.dto.js';
import type { IStatementRepository } from '../../../statements/application/ports/statement.port.js';

const COMPONENT = 'ReportService';

export const createReportService = (
  repository: IReportRepository,
  statements: IStatementRepository
): IReportService => ({
  async getSummary(
    filters?: SummaryQueryDTO
  ): Promise<Result<ReconciliationSummaryDTO, AppError>> {
    const totals = await repository.summary(filters);

    return Ok({
      from: filters?.from ?? null,
      to: filters?.to ?? null,
      statements: totals.statements,
      discrepancies: totals.discrepancies,
    });
  },

  async getStatementReport(
    statementId: string
  ): Promise<Result<StatementReportDTO, AppError>> {
    const statement = await statements.findById(statementId);
    if (!statement) {
      return Err(
        ErrorFactory.notFound(
          'Extracto não encontrado',
          'ReconciliationStatement',
          statementId,
          COMPONENT
        )
      );
    }

    const breakdown = await repository.statementBreakdown(statementId);
    return Ok({
      statement,
      entries: breakdown.entries,
      discrepancies: breakdown.discrepancies,
    });
  },
});
