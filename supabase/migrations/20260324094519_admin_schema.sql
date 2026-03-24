-- =============================================================================
-- Admin Schema Migration
-- Created: 2026-03-24
-- Description: Creates the isolated "admin" schema with all tables, RLS, and
--              helper functions for the VendoFlow admin system.
--
-- Dependency order:
--   CREATE SCHEMA → set_updated_at() → admin_users table →
--   is_admin_user() → RLS policies → remaining tables → indexes
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Schema
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS admin;

-- ---------------------------------------------------------------------------
-- 1. Helper trigger function: set_updated_at()
--    Generic BEFORE UPDATE trigger to keep updated_at current.
--    No table deps — safe to create first.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. admin.admin_users
--    Must be created BEFORE admin.is_admin_user() which references it.
-- ---------------------------------------------------------------------------
CREATE TABLE admin.admin_users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        UNIQUE NOT NULL,
  full_name     TEXT        NOT NULL,
  role          TEXT        NOT NULL CHECK (role IN ('super_admin', 'support', 'finance', 'reporting')),
  avatar_url    TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER admin_users_set_updated_at
  BEFORE UPDATE ON admin.admin_users
  FOR EACH ROW EXECUTE FUNCTION admin.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Helper function: admin.is_admin_user()
--    Returns TRUE if calling auth.uid() is an active admin user.
--    SECURITY DEFINER so it can bypass RLS on admin.admin_users itself.
--    Created AFTER admin.admin_users so the function body is valid.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.is_admin_user()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin.admin_users
    WHERE id = auth.uid() AND is_active = true
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. RLS on admin.admin_users
-- ---------------------------------------------------------------------------
ALTER TABLE admin.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_users: active admins can read all"
  ON admin.admin_users FOR SELECT USING (admin.is_admin_user());

CREATE POLICY "admin_users: super_admins can insert"
  ON admin.admin_users FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin.admin_users WHERE id = auth.uid() AND is_active = true AND role = 'super_admin')
  );

CREATE POLICY "admin_users: super_admins can update"
  ON admin.admin_users FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admin.admin_users WHERE id = auth.uid() AND is_active = true AND role = 'super_admin')
  );

CREATE POLICY "admin_users: super_admins can delete"
  ON admin.admin_users FOR DELETE USING (
    EXISTS (SELECT 1 FROM admin.admin_users WHERE id = auth.uid() AND is_active = true AND role = 'super_admin')
  );

-- ---------------------------------------------------------------------------
-- 5. admin.whatsapp_conversations
-- ---------------------------------------------------------------------------
CREATE TABLE admin.whatsapp_conversations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id       UUID        REFERENCES public.accounts(account_id) ON DELETE SET NULL,
  contact_phone     TEXT        NOT NULL,
  contact_name      TEXT,
  status            TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'pending')),
  assigned_agent_id UUID        REFERENCES admin.admin_users(id) ON DELETE SET NULL,
  last_message_at   TIMESTAMPTZ,
  unread_count      INT         NOT NULL DEFAULT 0,
  tags              TEXT[],
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_conversations: active admins full access"
  ON admin.whatsapp_conversations FOR ALL
  USING (admin.is_admin_user()) WITH CHECK (admin.is_admin_user());

-- ---------------------------------------------------------------------------
-- 6. admin.whatsapp_messages
-- ---------------------------------------------------------------------------
CREATE TABLE admin.whatsapp_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES admin.whatsapp_conversations(id) ON DELETE CASCADE,
  direction       TEXT        NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type    TEXT        NOT NULL CHECK (message_type IN ('text', 'template', 'image', 'document')),
  content         TEXT,
  template_name   TEXT,
  template_params JSONB,
  meta_message_id TEXT,
  status          TEXT        NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  sent_by_id      UUID        REFERENCES admin.admin_users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_messages: active admins full access"
  ON admin.whatsapp_messages FOR ALL
  USING (admin.is_admin_user()) WITH CHECK (admin.is_admin_user());

-- ---------------------------------------------------------------------------
-- 7. admin.reports
-- ---------------------------------------------------------------------------
CREATE TABLE admin.reports (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type    TEXT        NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly')),
  merchant_id    UUID        REFERENCES public.accounts(account_id) ON DELETE CASCADE,
  period_start   DATE        NOT NULL,
  period_end     DATE        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent', 'rejected')),
  data           JSONB       NOT NULL DEFAULT '{}',
  approved_by    UUID        REFERENCES admin.admin_users(id) ON DELETE SET NULL,
  approved_at    TIMESTAMPTZ,
  sent_at        TIMESTAMPTZ,
  rejection_note TEXT,
  created_by     UUID        REFERENCES admin.admin_users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports: active admins full access"
  ON admin.reports FOR ALL
  USING (admin.is_admin_user()) WITH CHECK (admin.is_admin_user());

-- ---------------------------------------------------------------------------
-- 8. admin.report_recipients
-- ---------------------------------------------------------------------------
CREATE TABLE admin.report_recipients (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID        NOT NULL REFERENCES admin.reports(id) ON DELETE CASCADE,
  conversation_id UUID        REFERENCES admin.whatsapp_conversations(id) ON DELETE CASCADE,
  sent_at         TIMESTAMPTZ,
  status          TEXT        NOT NULL DEFAULT 'pending'
);

ALTER TABLE admin.report_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_recipients: active admins full access"
  ON admin.report_recipients FOR ALL
  USING (admin.is_admin_user()) WITH CHECK (admin.is_admin_user());

-- ---------------------------------------------------------------------------
-- 9. admin.internal_notes
-- ---------------------------------------------------------------------------
CREATE TABLE admin.internal_notes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES admin.whatsapp_conversations(id) ON DELETE CASCADE,
  author_id       UUID        REFERENCES admin.admin_users(id) ON DELETE SET NULL,
  content         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin.internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internal_notes: active admins full access"
  ON admin.internal_notes FOR ALL
  USING (admin.is_admin_user()) WITH CHECK (admin.is_admin_user());

-- ---------------------------------------------------------------------------
-- 10. admin.activity_log
-- ---------------------------------------------------------------------------
CREATE TABLE admin.activity_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID        REFERENCES admin.admin_users(id) ON DELETE SET NULL,
  action        TEXT        NOT NULL,
  entity_type   TEXT,
  entity_id     UUID,
  metadata      JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin.activity_log ENABLE ROW LEVEL SECURITY;

-- Reads available to all active admins; writes go through service-role Edge Functions.
CREATE POLICY "activity_log: active admins can read"
  ON admin.activity_log FOR SELECT USING (admin.is_admin_user());

-- ---------------------------------------------------------------------------
-- 11. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_whatsapp_conversations_merchant ON admin.whatsapp_conversations (merchant_id);
CREATE INDEX idx_whatsapp_conversations_status   ON admin.whatsapp_conversations (status);
CREATE INDEX idx_whatsapp_conversations_agent    ON admin.whatsapp_conversations (assigned_agent_id);
CREATE INDEX idx_whatsapp_messages_conversation  ON admin.whatsapp_messages (conversation_id);
CREATE INDEX idx_whatsapp_messages_created_at    ON admin.whatsapp_messages (created_at DESC);
CREATE INDEX idx_reports_merchant                ON admin.reports (merchant_id);
CREATE INDEX idx_reports_status                  ON admin.reports (status);
CREATE INDEX idx_activity_log_admin_user         ON admin.activity_log (admin_user_id);
CREATE INDEX idx_activity_log_created_at         ON admin.activity_log (created_at DESC);
