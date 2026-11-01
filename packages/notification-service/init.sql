CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  locale TEXT NOT NULL DEFAULT 'pt',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_active
  ON notification_templates(is_active, channel);
CREATE INDEX IF NOT EXISTS idx_notification_templates_created_at
  ON notification_templates(created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  template_code TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts >= 1),
  provider TEXT,
  provider_message_id TEXT,
  idempotency_key TEXT UNIQUE,
  last_error TEXT,
  metadata JSONB,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_status
  ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_channel
  ON notifications(channel);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON notifications(recipient);
CREATE INDEX IF NOT EXISTS idx_notifications_template_code
  ON notifications(template_code);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  provider TEXT NOT NULL,
  provider_message_id TEXT,
  error_code TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (notification_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification
  ON notification_deliveries(notification_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_created_at
  ON notification_deliveries(created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_templates_updated_at
  ON notification_templates;
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO notification_templates
  (code, name, channel, subject, body, variables, locale, metadata)
VALUES
  ('welcome_email', 'Boas-vindas', 'email',
   'Bem-vindo à InstantPay',
   'Olá {{name}}, a sua conta foi criada com sucesso.',
   '["name"]'::jsonb, 'pt', '{"category":"onboarding"}'::jsonb),
  ('payment_success_sms', 'Pagamento confirmado', 'sms', NULL,
   'Pagamento de {{amount}} {{currency}} confirmado.',
   '["amount","currency"]'::jsonb, 'pt', '{"category":"payments"}'::jsonb)
ON CONFLICT (code) DO NOTHING;
