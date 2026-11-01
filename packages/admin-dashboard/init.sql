CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS admin_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  health_path TEXT NOT NULL DEFAULT '/health',
  timeout_ms INTEGER NOT NULL DEFAULT 3000
    CHECK (timeout_ms >= 100 AND timeout_ms <= 60000),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_services_active
  ON admin_services(is_active, name);
CREATE INDEX IF NOT EXISTS idx_admin_services_created_at
  ON admin_services(created_at DESC);

CREATE TABLE IF NOT EXISTS admin_health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES admin_services(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'unhealthy')),
  status_code INTEGER,
  latency_ms INTEGER NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
  error_message TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_health_checks_service
  ON admin_health_checks(service_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_health_checks_checked_at
  ON admin_health_checks(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_health_checks_status
  ON admin_health_checks(status, checked_at DESC);

CREATE TABLE IF NOT EXISTS admin_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'resolved')),
  service_name TEXT,
  opened_by TEXT NOT NULL,
  assigned_to TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_incidents_created_at
  ON admin_incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_incidents_status
  ON admin_incidents(status, severity);
CREATE INDEX IF NOT EXISTS idx_admin_incidents_service
  ON admin_incidents(service_name);

CREATE TABLE IF NOT EXISTS admin_feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_percentage INTEGER NOT NULL DEFAULT 100
    CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_feature_flags_created_at
  ON admin_feature_flags(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_feature_flags_enabled
  ON admin_feature_flags(is_enabled);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_admin_services_updated_at ON admin_services;
CREATE TRIGGER update_admin_services_updated_at
  BEFORE UPDATE ON admin_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_incidents_updated_at ON admin_incidents;
CREATE TRIGGER update_admin_incidents_updated_at
  BEFORE UPDATE ON admin_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_feature_flags_updated_at
  ON admin_feature_flags;
CREATE TRIGGER update_admin_feature_flags_updated_at
  BEFORE UPDATE ON admin_feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO admin_services (name, base_url, health_path, timeout_ms)
VALUES
  ('core-banking', 'http://127.0.0.1:9999', '/health', 3000),
  ('gateway-api', 'http://127.0.0.1:9998', '/health', 3000),
  ('payment-processor', 'http://127.0.0.1:9997', '/health', 3000),
  ('fraud-detection', 'http://127.0.0.1:9996', '/health', 3000),
  ('notification-service', 'http://127.0.0.1:9995', '/health', 3000),
  ('reconciliation', 'http://127.0.0.1:9994', '/health', 3000)
ON CONFLICT (name) DO NOTHING;

INSERT INTO admin_feature_flags
  (key, name, description, is_enabled, rollout_percentage, metadata)
VALUES
  ('instant_payouts', 'Pagamentos instantâneos', 'Payouts imediatos', TRUE, 25,
   '{"owner":"payments"}'::jsonb),
  ('new_checkout', 'Novo checkout', 'Nova experiência de checkout', FALSE, 0,
   '{"owner":"frontend"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
