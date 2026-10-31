CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS gateway_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read', 'write']::TEXT[],
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 120
    CHECK (rate_limit_per_minute > 0 AND rate_limit_per_minute <= 100000),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gateway_api_keys_scopes_valid
    CHECK (cardinality(scopes) > 0 AND scopes <@ ARRAY['read', 'write', 'admin']::TEXT[])
);

CREATE INDEX IF NOT EXISTS idx_gateway_api_keys_hash
  ON gateway_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_gateway_api_keys_active
  ON gateway_api_keys(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_gateway_api_keys_created_at
  ON gateway_api_keys(created_at DESC);

CREATE TABLE IF NOT EXISTS gateway_rate_limit_windows (
  api_key_id UUID NOT NULL REFERENCES gateway_api_keys(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (api_key_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_gateway_rate_limit_windows_start
  ON gateway_rate_limit_windows(window_start);

CREATE TABLE IF NOT EXISTS gateway_request_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id UUID REFERENCES gateway_api_keys(id) ON DELETE SET NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  upstream TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  ip_address INET,
  user_agent TEXT,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gateway_request_logs_created_at
  ON gateway_request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gateway_request_logs_api_key
  ON gateway_request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_gateway_request_logs_status
  ON gateway_request_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_gateway_request_logs_upstream
  ON gateway_request_logs(upstream);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_gateway_api_keys_updated_at ON gateway_api_keys;
CREATE TRIGGER update_gateway_api_keys_updated_at
  BEFORE UPDATE ON gateway_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
