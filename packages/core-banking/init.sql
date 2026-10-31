CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_name TEXT NOT NULL,
  bank_code TEXT NOT NULL UNIQUE,
  swift_code TEXT UNIQUE,
  status BOOLEAN DEFAULT FALSE, 
  reserve_percentage NUMERIC(5,4) DEFAULT 0.1000 CHECK (reserve_percentage >= 0 AND reserve_percentage <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  bi_number TEXT NOT NULL UNIQUE,
  nif TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  refresh_token TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address INET,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = TRUE;

-- Sequência usada para gerar números de conta únicos.
CREATE SEQUENCE IF NOT EXISTS account_number_seq START 100000001;

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE RESTRICT,
  account_number TEXT NOT NULL UNIQUE,
  account_type TEXT NOT NULL CHECK (account_type IN ('CORRENTE', 'POUPANCA', 'PRAZO', 'EMPRESARIAL')),
  balance NUMERIC(15,2) DEFAULT 0.00 CHECK (balance >= 0),
  available_balance NUMERIC(15,2) DEFAULT 0.00 CHECK (available_balance >= 0),
  blocked_amount NUMERIC(15,2) DEFAULT 0.00 CHECK (blocked_amount >= 0),
  currency_code CHAR(3) DEFAULT 'AOA',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'closed', 'frozen')),
  last_transaction_date TIMESTAMPTZ,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT balance_consistency CHECK (available_balance + blocked_amount = balance)
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  to_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  fee NUMERIC(15,2) DEFAULT 0.00 CHECK (fee >= 0),
  currency_code CHAR(3) DEFAULT 'AOA',
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'PAYMENT', 'REFUND')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed')),
  reference TEXT UNIQUE NOT NULL, 
  description TEXT,
  metadata JSONB, 
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT different_accounts CHECK (
    from_account_id IS DISTINCT FROM to_account_id
  ),
  CONSTRAINT valid_transaction CHECK (
    (transaction_type IN ('DEPOSIT') AND from_account_id IS NULL AND to_account_id IS NOT NULL) OR
    (transaction_type IN ('WITHDRAWAL') AND from_account_id IS NOT NULL AND to_account_id IS NULL) OR
    (transaction_type IN ('TRANSFER', 'PAYMENT', 'REFUND') AND from_account_id IS NOT NULL AND to_account_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  transaction_id UUID REFERENCES transactions(id) ON DELETE RESTRICT,
  amount NUMERIC(15,2) NOT NULL,
  balance_after NUMERIC(15,2) NOT NULL CHECK (balance_after >= 0),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_holds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  transaction_id UUID REFERENCES transactions(id),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  hold_type TEXT CHECK (hold_type IN ('PAYMENT', 'DISPUTE', 'COMPLIANCE', 'RESERVE')),
  released_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_reserves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE RESTRICT,
  calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_deposits NUMERIC(18,2) NOT NULL CHECK (total_deposits >= 0),
  required_reserve NUMERIC(18,2) NOT NULL CHECK (required_reserve >= 0),
  actual_reserve NUMERIC(18,2) NOT NULL CHECK (actual_reserve >= 0),
  is_compliant BOOLEAN GENERATED ALWAYS AS (actual_reserve >= required_reserve) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(bank_id, calculation_date)
);

CREATE TABLE IF NOT EXISTS transaction_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  daily_transfer_limit NUMERIC(15,2) DEFAULT 1000000.00,
  single_transaction_limit NUMERIC(15,2) DEFAULT 500000.00,
  monthly_limit NUMERIC(15,2) DEFAULT 5000000.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_transaction_summary (
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_debits NUMERIC(15,2) DEFAULT 0.00,
  total_credits NUMERIC(15,2) DEFAULT 0.00,
  transaction_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (account_id, transaction_date)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES 

-- Accounts
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_bank_id ON accounts(bank_id);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_accounts_account_number ON accounts(account_number);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_from_account ON transactions(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_account ON transactions(to_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(transaction_type, status);

-- Ledger
CREATE INDEX IF NOT EXISTS idx_ledger_account_id ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_transaction_id ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_account_created ON ledger_entries(account_id, created_at DESC);

-- Holds
CREATE INDEX IF NOT EXISTS idx_holds_account_id ON account_holds(account_id);
CREATE INDEX IF NOT EXISTS idx_holds_expires_at ON account_holds(expires_at) WHERE released_at IS NULL;

-- Audit Log
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);

-- Daily Summary
CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON daily_transaction_summary(transaction_date DESC);


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_banks_updated_at ON banks;
CREATE TRIGGER update_banks_updated_at BEFORE UPDATE ON banks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
