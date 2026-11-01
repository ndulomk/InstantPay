import type { Database } from '@instantpay/config';
import type { IReportRepository } from '../../application/ports/report.port.js';
import type {
  DiscrepancyTotalsDTO,
  StatementReportDTO,
  SummaryQueryDTO,
} from '../../application/dtos/report.dto.js';
import type {
  DiscrepancyStatus,
  DiscrepancyType,
} from '../../../matching/application/dtos/matching.dto.js';

type StatementTotalsRow = {
  total: number;
  draft: number;
  running: number;
  completed: number;
  failed: number;
  entries_count: string | number;
  matched_count: string | number;
  unmatched_count: string | number;
  discrepancy_count: string | number;
  matched_amount: string | number;
  unmatched_amount: string | number;
};

type DiscrepancyTotalsRow = {
  total: number;
  open: number;
  resolved: number;
  ignored: number;
};

type DiscrepancyByTypeRow = {
  type: DiscrepancyType;
  status: DiscrepancyStatus;
  count: number;
};

type EntryTotalsRow = {
  total: number;
  matched: number;
  unmatched: number;
  discrepancy: number;
  ignored: number;
};

const buildDateConditions = (
  startIndex: number,
  filters?: SummaryQueryDTO
): { clause: string; values: unknown[] } => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let index = startIndex;

  if (filters?.from) {
    conditions.push(`created_at >= $${index}`);
    values.push(filters.from);
    index += 1;
  }
  if (filters?.to) {
    conditions.push(`created_at <= $${index}`);
    values.push(filters.to);
  }

  return {
    clause: conditions.length > 0 ? conditions.join(' AND ') : '',
    values,
  };
};

const toDiscrepancyTotals = (
  totals: DiscrepancyTotalsRow,
  byType: DiscrepancyByTypeRow[]
): DiscrepancyTotalsDTO => ({
  total: Number(totals.total),
  open: Number(totals.open),
  resolved: Number(totals.resolved),
  ignored: Number(totals.ignored),
  byType: byType.map((row) => ({
    type: row.type,
    status: row.status,
    count: Number(row.count),
  })),
});

export const createReportRepository = (
  db: Database
): IReportRepository => ({
  async summary(filters?: SummaryQueryDTO) {
    const statementDates = buildDateConditions(1, filters);
    const statements = await db.query<StatementTotalsRow>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
              COUNT(*) FILTER (WHERE status = 'running')::int AS running,
              COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
              COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
              COALESCE(SUM(entries_count), 0) AS entries_count,
              COALESCE(SUM(matched_count), 0) AS matched_count,
              COALESCE(SUM(unmatched_count), 0) AS unmatched_count,
              COALESCE(SUM(discrepancy_count), 0) AS discrepancy_count,
              COALESCE(SUM(matched_amount), 0) AS matched_amount,
              COALESCE(SUM(unmatched_amount), 0) AS unmatched_amount
       FROM reconciliation_statements
       ${statementDates.clause ? `WHERE ${statementDates.clause}` : ''}`,
      statementDates.values
    );

    const discrepancyDates = buildDateConditions(1, filters);
    const totals = await db.query<DiscrepancyTotalsRow>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'open')::int AS open,
              COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
              COUNT(*) FILTER (WHERE status = 'ignored')::int AS ignored
       FROM reconciliation_discrepancies
       ${discrepancyDates.clause ? `WHERE ${discrepancyDates.clause}` : ''}`,
      discrepancyDates.values
    );

    const byType = await db.query<DiscrepancyByTypeRow>(
      `SELECT type, status, COUNT(*)::int AS count
       FROM reconciliation_discrepancies
       ${discrepancyDates.clause ? `WHERE ${discrepancyDates.clause}` : ''}
       GROUP BY type, status
       ORDER BY type ASC, status ASC`,
      discrepancyDates.values
    );

    const row = statements.rows[0] ?? {
      total: 0,
      draft: 0,
      running: 0,
      completed: 0,
      failed: 0,
      entries_count: 0,
      matched_count: 0,
      unmatched_count: 0,
      discrepancy_count: 0,
      matched_amount: 0,
      unmatched_amount: 0,
    };

    return {
      statements: {
        total: Number(row.total),
        draft: Number(row.draft),
        running: Number(row.running),
        completed: Number(row.completed),
        failed: Number(row.failed),
        entriesCount: Number(row.entries_count),
        matchedCount: Number(row.matched_count),
        unmatchedCount: Number(row.unmatched_count),
        discrepancyCount: Number(row.discrepancy_count),
        matchedAmount: Number(row.matched_amount),
        unmatchedAmount: Number(row.unmatched_amount),
      },
      discrepancies: toDiscrepancyTotals(
        totals.rows[0] ?? {
          total: 0,
          open: 0,
          resolved: 0,
          ignored: 0,
        },
        byType.rows
      ),
    };
  },

  async statementBreakdown(statementId: string) {
    const entries = await db.query<EntryTotalsRow>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'matched')::int AS matched,
              COUNT(*) FILTER (WHERE status = 'unmatched')::int AS unmatched,
              COUNT(*) FILTER (WHERE status = 'discrepancy')::int AS discrepancy,
              COUNT(*) FILTER (WHERE status = 'ignored')::int AS ignored
       FROM reconciliation_entries
       WHERE statement_id = $1`,
      [statementId]
    );

    const totals = await db.query<DiscrepancyTotalsRow>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'open')::int AS open,
              COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
              COUNT(*) FILTER (WHERE status = 'ignored')::int AS ignored
       FROM reconciliation_discrepancies
       WHERE statement_id = $1`,
      [statementId]
    );

    const byType = await db.query<DiscrepancyByTypeRow>(
      `SELECT type, status, COUNT(*)::int AS count
       FROM reconciliation_discrepancies
       WHERE statement_id = $1
       GROUP BY type, status
       ORDER BY type ASC, status ASC`,
      [statementId]
    );

    const entryRow = entries.rows[0] ?? {
      total: 0,
      matched: 0,
      unmatched: 0,
      discrepancy: 0,
      ignored: 0,
    };

    const result: {
      entries: StatementReportDTO['entries'];
      discrepancies: DiscrepancyTotalsDTO;
    } = {
      entries: {
        total: Number(entryRow.total),
        matched: Number(entryRow.matched),
        unmatched: Number(entryRow.unmatched),
        discrepancy: Number(entryRow.discrepancy),
        ignored: Number(entryRow.ignored),
      },
      discrepancies: toDiscrepancyTotals(
        totals.rows[0] ?? {
          total: 0,
          open: 0,
          resolved: 0,
          ignored: 0,
        },
        byType.rows
      ),
    };

    return result;
  },
});
