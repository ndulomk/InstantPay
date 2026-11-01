import { z } from 'zod';
import type {
  DiscrepancyStatus,
  DiscrepancyType,
} from '../../../matching/application/dtos/matching.dto.js';
import type { StatementResponseDTO } from '../../../statements/application/dtos/statement.dto.js';

export type StatementTotalsDTO = {
  total: number;
  draft: number;
  running: number;
  completed: number;
  failed: number;
  entriesCount: number;
  matchedCount: number;
  unmatchedCount: number;
  discrepancyCount: number;
  matchedAmount: number;
  unmatchedAmount: number;
};

export type DiscrepancyTotalsDTO = {
  total: number;
  open: number;
  resolved: number;
  ignored: number;
  byType: Array<{
    type: DiscrepancyType;
    status: DiscrepancyStatus;
    count: number;
  }>;
};

export type ReconciliationSummaryDTO = {
  from: Date | null;
  to: Date | null;
  statements: StatementTotalsDTO;
  discrepancies: DiscrepancyTotalsDTO;
};

export type StatementReportDTO = {
  statement: StatementResponseDTO;
  entries: {
    total: number;
    matched: number;
    unmatched: number;
    discrepancy: number;
    ignored: number;
  };
  discrepancies: DiscrepancyTotalsDTO;
};

export type SummaryQueryDTO = {
  from?: Date;
  to?: Date;
};

export const summaryQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine(
    (value) => !value.from || !value.to || value.from <= value.to,
    {
      path: ['to'],
      message: 'A data final deve ser posterior à inicial',
    }
  );
