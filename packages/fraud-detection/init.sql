CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS fraud_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  field TEXT NOT NULL,
  operator TEXT NOT NULL
    CHECK (operator IN (
      'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in',
      'contains', 'starts_with', 'ends_with', 'exists', 'not_exists'
    )),
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 100 CHECK (priority >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_rules_active
  ON fraud_rules(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_fraud_rules_field
  ON fraud_rules(field);

CREATE TABLE IF NOT EXISTS fraud_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_type TEXT NOT NULL
    CHECK (subject_type IN ('TRANSACTION', 'PAYMENT', 'ACCOUNT', 'LOGIN')),
  subject_id TEXT,
  user_id TEXT,
  amount NUMERIC(15,2) CHECK (amount IS NULL OR amount >= 0),
  currency_code CHAR(3),
  method TEXT,
  channel TEXT,
  country TEXT,
  email TEXT,
  phone TEXT,
  ip_address TEXT,
  device_id TEXT,
  account_age_days INTEGER CHECK (account_age_days IS NULL OR account_age_days >= 0),
  transactions_last_hour INTEGER
    CHECK (transactions_last_hour IS NULL OR transactions_last_hour >= 0),
  transactions_last_day INTEGER
    CHECK (transactions_last_day IS NULL OR transactions_last_day >= 0),
  is_new_device BOOLEAN,
  is_foreign_ip BOOLEAN,
  metadata JSONB,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  risk_level TEXT NOT NULL
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  decision TEXT NOT NULL
    CHECK (decision IN ('allow', 'review', 'block')),
  matched_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  feedback_outcome TEXT
    CHECK (feedback_outcome IS NULL OR feedback_outcome IN ('confirmed_fraud', 'legitimate')),
  feedback_notes TEXT,
  feedback_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_assessments_created_at
  ON fraud_assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_subject
  ON fraud_assessments(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_user
  ON fraud_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_decision
  ON fraud_assessments(decision);
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_risk
  ON fraud_assessments(risk_level);

CREATE TABLE IF NOT EXISTS fraud_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES fraud_assessments(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL
    CHECK (outcome IN ('confirmed_fraud', 'legitimate')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_feedback_assessment
  ON fraud_feedback(assessment_id);
CREATE INDEX IF NOT EXISTS idx_fraud_feedback_created_at
  ON fraud_feedback(created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_fraud_rules_updated_at ON fraud_rules;
CREATE TRIGGER update_fraud_rules_updated_at
  BEFORE UPDATE ON fraud_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO fraud_rules
  (code, name, description, field, operator, value, score, severity, priority)
VALUES
  ('high_amount', 'Valor elevado', 'Pagamentos acima de 100 000',
   'amount', 'gt', '100000'::jsonb, 60, 'high', 10),
  ('new_device', 'Dispositivo novo', 'Primeira utilização do dispositivo',
   'isNewDevice', 'eq', 'true'::jsonb, 30, 'medium', 20),
  ('foreign_ip', 'IP estrangeiro', 'Pedido originado fora do país',
   'isForeignIp', 'eq', 'true'::jsonb, 25, 'medium', 30),
  ('high_velocity_1h', 'Velocidade elevada', 'Mais de 10 pedidos na última hora',
   'transactionsLastHour', 'gte', '10'::jsonb, 40, 'high', 40)
ON CONFLICT (code) DO NOTHING;
