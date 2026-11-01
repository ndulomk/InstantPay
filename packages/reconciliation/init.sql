CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS reconciliation_statements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL
    CHECK (source IN ('core_banking', 'payment_processor', 'manual')),
  account_reference TEXT NOT NULL,
  currency_code CHAR(3) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  opening_balance NUMERIC(15,2),
  closing_balance NUMERIC(15,2),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'running', 'completed', 'failed')),
  entries_count INTEGER NOT NULL DEFAULT 0 CHECK (entries_count >= 0),
  matched_count INTEGER NOT NULL DEFAULT 0 CHECK (matched_count >= 0),
  unmatched_count INTEGER NOT NULL DEFAULT 0 CHECK (unmatched_count >= 0),
  discrepancy_count INTEGER NOT NULL DEFAULT 0 CHECK (discrepancy_count >= 0),
  matched_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  unmatched_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  metadata JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_statements_created_at
  ON reconciliation_statements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reconciliation_statements_status
  ON reconciliation_statements(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_statements_source
  ON reconciliation_statements(source);
CREATE INDEX IF NOT EXISTS idx_reconciliation_statements_period
  ON reconciliation_statements(period_start, period_end);

CREATE TABLE IF NOT EXISTS reconciliation_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id UUID NOT NULL
    REFERENCES reconciliation_statements(id) ON DELETE CASCADE,
  external_reference TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency_code CHAR(3) NOT NULL,
  value_date DATE NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (status IN ('unmatched', 'matched', 'discrepancy', 'ignored')),
  matched_internal_id UUID,
  discrepancy_type TEXT,
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_entries_statement
  ON reconciliation_entries(statement_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reconciliation_entries_reference
  ON reconciliation_entries(statement_id, external_reference);
CREATE INDEX IF NOT EXISTS idx_reconciliation_entries_status
  ON reconciliation_entries(statement_id, status);

CREATE TABLE IF NOT EXISTS reconciliation_internal_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL
    CHECK (source IN ('core_banking', 'payment_processor', 'manual')),
  source_reference TEXT NOT NULL,
  account_reference TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency_code CHAR(3) NOT NULL,
  value_date DATE NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (status IN ('unmatched', 'matched', 'discrepancy', 'ignored')),
  matched_entry_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, source_reference, direction, value_date, account_reference)
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_internal_created_at
  ON reconciliation_internal_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reconciliation_internal_lookup
  ON reconciliation_internal_records(
    source, account_reference, currency_code, value_date, status
  );
CREATE INDEX IF NOT EXISTS idx_reconciliation_internal_reference
  ON reconciliation_internal_records(source, source_reference);

CREATE TABLE IF NOT EXISTS reconciliation_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id UUID NOT NULL
    REFERENCES reconciliation_statements(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL
    REFERENCES reconciliation_entries(id) ON DELETE CASCADE,
  internal_record_id UUID NOT NULL
    REFERENCES reconciliation_internal_records(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  match_type TEXT NOT NULL
    CHECK (match_type IN ('reference', 'amount_date', 'amount_window')),
  matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entry_id),
  UNIQUE (internal_record_id)
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_matches_statement
  ON reconciliation_matches(statement_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reconciliation_discrepancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id UUID NOT NULL
    REFERENCES reconciliation_statements(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES reconciliation_entries(id) ON DELETE SET NULL,
  internal_record_id UUID
    REFERENCES reconciliation_internal_records(id) ON DELETE SET NULL,
  type TEXT NOT NULL
    CHECK (type IN (
      'missing_internal', 'missing_external', 'amount_mismatch',
      'duplicate', 'balance_mismatch'
    )),
  expected_amount NUMERIC(15,2),
  actual_amount NUMERIC(15,2),
  difference NUMERIC(15,2),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'ignored')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_discrepancies_statement
  ON reconciliation_discrepancies(statement_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reconciliation_discrepancies_status
  ON reconciliation_discrepancies(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_discrepancies_type
  ON reconciliation_discrepancies(type);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reconciliation_statements_updated_at
  ON reconciliation_statements;
CREATE TRIGGER update_reconciliation_statements_updated_at
  BEFORE UPDATE ON reconciliation_statements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reconciliation_entries_updated_at
  ON reconciliation_entries;
CREATE TRIGGER update_reconciliation_entries_updated_at
  BEFORE UPDATE ON reconciliation_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reconciliation_internal_updated_at
  ON reconciliation_internal_records;
CREATE TRIGGER update_reconciliation_internal_updated_at
  BEFORE UPDATE ON reconciliation_internal_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reconciliation_discrepancies_updated_at
  ON reconciliation_discrepancies;
CREATE TRIGGER update_reconciliation_discrepancies_updated_at
  BEFORE UPDATE ON reconciliation_discrepancies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
