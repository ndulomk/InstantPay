CREATE TABLE IF NOT EXISTS banks (
  id SERIAL PRIMARY KEY,
  bank_name TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  status INTEGER DEFAULT 1 CHECK (status IN(0, 1)), -- 0=inativo, 1=ativo
  reserve_percentage NUMERIC(5,4) DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users(
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  bi_number TEXT NOT NULL,
  nif TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  kyc_status TEXT DEFAULT 'pending', -- CHECK (kyc_status IN ('pending', 'approved', 'rejected'))
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
  account_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  bank_id INTEGER NOT NULL REFERENCES banks(id) ON DELETE RESTRICT,
  account_number TEXT NOT NULL UNIQUE,
  account_type TEXT NOT NULL, -- (account_type IN ('CORRENTE', 'POUPANCA', 'PRAZO', 'EMPRESARIAL'))
  balance NUMERIC(15,2) DEFAULT 0.00, -- CHECK (balance >= -overdraft_limit)
  available_balance NUMERIC(15,2) DEFAULT 0.00,
  blocked_amount NUMERIC(15,2) DEFAULT 0.00,
  currency_code CHAR(3) DEFAULT 'AOA',
  status TEXT DEFAULT 'active', -- CHECK (status IN ('active', 'blocked', 'closed', 'frozen')),
  last_transaction_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/*CHECK (transaction_type IN (
        'CASH_DEPOSIT', 'CASH_WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT',
        'INTERBANK_IN', 'INTERBANK_OUT', 'PAYMENT', 'REVERSAL', 'FEE_CHARGE'
    )),  */
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE RESTRICT,
  amount NUMERIC(15,2) NOT NULL,
  currency_code CHAR(3) DEFAULT 'AOA',
  transaction_type TEXT NOT NULL,
  debit_credit TEXT NOT NULL, -- CHECK (debit_credit IN ('DEBIT', 'CREDIT'))
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed',
  description TEXT,
  initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounting_entries (
  entry_id SERIAL PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES transactions(transaction_id),
  account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE RESTRICT, 
  debit_amount NUMERIC(15,2) DEFAULT 0.00,
  credit_amount NUMERIC(15,2) DEFAULT 0.00,
  entry_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_reserves (
    id SERIAL PRIMARY KEY,
    bank_id INTEGER NOT NULL REFERENCES banks(id),
    
    -- CÁLCULOS DE RESERVA
    total_deposits NUMERIC(18,2) NOT NULL,
    required_reserve NUMERIC(18,2) NOT NULL,
    actual_reserve NUMERIC(18,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    -- IDENTIFICAÇÃO
    table_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(50) NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    
    -- DADOS
    old_values JSONB,
    new_values JSONB,
    
    -- RASTREABILIDADE
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    
    -- TIMESTAMP IMUTÁVEL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_banks_code ON banks(bank_code);
CREATE INDEX idx_banks_status ON banks(status);

CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_bank ON accounts(bank_id);
CREATE INDEX idx_accounts_number ON accounts(account_number);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_accounts_balance ON accounts(balance);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_bi ON users (bi_number);
CREATE INDEX idx_users_status ON users(kyc_status);

CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(created_at);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_amount ON transactions(amount);

CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_record ON audit_log(record_id);
CREATE INDEX idx_audit_date ON audit_log(created_at);



