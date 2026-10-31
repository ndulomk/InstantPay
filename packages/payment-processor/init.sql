CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS payment_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL UNIQUE,
  idempotency_key TEXT UNIQUE,
  merchant_reference TEXT,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'AOA',
  refunded_amount NUMERIC(15,2) NOT NULL DEFAULT 0
    CHECK (refunded_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'processing', 'requires_action', 'succeeded',
      'failed', 'cancelled', 'refunded', 'partially_refunded'
    )),
  method TEXT NOT NULL
    CHECK (method IN ('CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CASH')),
  provider TEXT NOT NULL,
  provider_reference TEXT,
  description TEXT,
  metadata JSONB,
  customer_email TEXT,
  customer_phone TEXT,
  failure_code TEXT,
  failure_message TEXT,
  authorized_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_refunded_within_amount
    CHECK (refunded_amount <= amount),
  CONSTRAINT payment_provider_reference_unique
    UNIQUE (provider, provider_reference)
);

CREATE INDEX IF NOT EXISTS idx_payment_payments_status
  ON payment_payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_payments_provider
  ON payment_payments(provider);
CREATE INDEX IF NOT EXISTS idx_payment_payments_merchant_reference
  ON payment_payments(merchant_reference);
CREATE INDEX IF NOT EXISTS idx_payment_payments_created_at
  ON payment_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_payments_idempotency_key
  ON payment_payments(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payment_payments(id) ON DELETE RESTRICT,
  reference TEXT NOT NULL UNIQUE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'succeeded', 'failed')),
  provider TEXT NOT NULL,
  provider_refund_reference TEXT,
  reason TEXT,
  failure_code TEXT,
  failure_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment_id
  ON payment_refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_status
  ON payment_refunds(status);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_created_at
  ON payment_refunds(created_at DESC);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payment_id UUID REFERENCES payment_payments(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_webhook_events_provider_event_unique
    UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_payment_id
  ON payment_webhook_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_created_at
  ON payment_webhook_events(created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payment_payments_updated_at ON payment_payments;
CREATE TRIGGER update_payment_payments_updated_at
  BEFORE UPDATE ON payment_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_refunds_updated_at ON payment_refunds;
CREATE TRIGGER update_payment_refunds_updated_at
  BEFORE UPDATE ON payment_refunds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
