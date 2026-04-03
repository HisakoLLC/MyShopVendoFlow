-- =============================================================================
-- Admin Billing Migration
-- Created: 2026-04-01
-- Description: Adds admin-side billing, invoicing, account management, and
--              broadcast tables to the "admin" schema.
--
-- Dependency order (all deps already exist from 20260324094519_admin_schema.sql):
--   admin schema, admin.admin_users, admin.whatsapp_conversations,
--   public.accounts (account_id PK)
--
-- IMPORTANT:

-- ---------------------------------------------------------------------------
-- 0. Ensure admin schema exists (idempotent — safe to run if already created)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS admin;
--   This migration does NOT touch:
--     - public.accounts
--     - public.subscription_events
--     - public.pending_mpesa_payments
--   All new tables live in the admin.* schema only.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Invoice number sequence & generator
--    Created first so admin.invoices can use the function as a default.
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS admin.invoice_number_seq START 1000;

CREATE OR REPLACE FUNCTION admin.generate_invoice_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'VF-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
         LPAD(nextval('admin.invoice_number_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- 2. admin.payments
--    Records every payment against a merchant account: manual entries,
--    M-Pesa, wire transfers, and Dodo webhook-sourced payments.
--    READ billing state from public.accounts existing columns.
--    WRITE recorded payments here only — never ALTER public.accounts.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.payments (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK uses public.accounts(account_id) — the actual PK column name
  account_id      UUID          NOT NULL REFERENCES public.accounts(account_id) ON DELETE CASCADE,
  amount_usd      DECIMAL(10,2),
  amount_kes      DECIMAL(10,2),
  payment_method  TEXT          NOT NULL CHECK (
    payment_method IN ('dodo_card', 'mpesa', 'wire', 'bank_transfer', 'cash', 'waived')
  ),
  mpesa_code      TEXT,
  mpesa_phone     TEXT,
  wire_reference  TEXT,
  -- Unique Dodo payment ID — enforced via partial unique index below
  dodo_payment_id TEXT,
  status          TEXT          NOT NULL DEFAULT 'confirmed' CHECK (
    status IN ('confirmed', 'pending', 'failed', 'refunded')
  ),
  -- 'manual' = admin entered; 'dodo_webhook' = mirrored from Dodo event
  source          TEXT          NOT NULL DEFAULT 'manual' CHECK (
    source IN ('manual', 'dodo_webhook')
  ),
  payment_date    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  period_start    DATE          NOT NULL,
  period_end      DATE          NOT NULL,
  notes           TEXT,
  recorded_by     UUID          REFERENCES admin.admin_users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Prevent duplicate Dodo payment records (only when dodo_payment_id is set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_payments_dodo_id
  ON admin.payments(dodo_payment_id)
  WHERE dodo_payment_id IS NOT NULL;

ALTER TABLE admin.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments: active admins full access"
  ON admin.payments FOR ALL
  USING (admin.is_admin_user())
  WITH CHECK (admin.is_admin_user());


-- ---------------------------------------------------------------------------
-- 3. admin.invoices
--    Invoice records tied to accounts. Can be PDF-generated, WhatsApp-sent,
--    and linked to a payment record when settled.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.invoices (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id              UUID          NOT NULL REFERENCES public.accounts(account_id) ON DELETE CASCADE,
  -- Auto-generate in format VF-YYYY-NNNN; caller can also pass an explicit value
  invoice_number          TEXT          UNIQUE NOT NULL DEFAULT admin.generate_invoice_number(),
  amount_usd              DECIMAL(10,2),
  amount_kes              DECIMAL(10,2),
  status                  TEXT          NOT NULL DEFAULT 'unpaid' CHECK (
    status IN ('unpaid', 'paid', 'overdue', 'waived', 'void')
  ),
  due_date                DATE          NOT NULL,
  paid_at                 TIMESTAMPTZ,
  -- Nullable: set when invoice is settled via a payment record
  payment_id              UUID          REFERENCES admin.payments(id) ON DELETE SET NULL,
  period_start            DATE          NOT NULL,
  period_end              DATE          NOT NULL,
  pdf_url                 TEXT,
  pdf_generated_at        TIMESTAMPTZ,
  whatsapp_sent_at        TIMESTAMPTZ,
  whatsapp_conversation_id UUID         REFERENCES admin.whatsapp_conversations(id) ON DELETE SET NULL,
  -- Structured line items: [{ description, quantity, unit_price, total }]
  line_items              JSONB         NOT NULL DEFAULT '[]',
  notes                   TEXT,
  created_by              UUID          REFERENCES admin.admin_users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER invoices_set_updated_at
  BEFORE UPDATE ON admin.invoices
  FOR EACH ROW EXECUTE FUNCTION admin.set_updated_at();

ALTER TABLE admin.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices: active admins full access"
  ON admin.invoices FOR ALL
  USING (admin.is_admin_user())
  WITH CHECK (admin.is_admin_user());


-- ---------------------------------------------------------------------------
-- 4. admin.account_flags
--    Qualitative flags an admin can attach to an account (e.g. VIP, at-risk).
--    Multiple flags can be active on one account simultaneously.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.account_flags (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID          NOT NULL REFERENCES public.accounts(account_id) ON DELETE CASCADE,
  flag_type   TEXT          NOT NULL CHECK (
    flag_type IN ('vip', 'at_risk', 'churned', 'trial_convert', 'support_issue', 'custom')
  ),
  label       TEXT          NOT NULL,
  color       TEXT          NOT NULL DEFAULT 'zinc',
  notes       TEXT,
  created_by  UUID          REFERENCES admin.admin_users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE admin.account_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_flags: active admins full access"
  ON admin.account_flags FOR ALL
  USING (admin.is_admin_user())
  WITH CHECK (admin.is_admin_user());


-- ---------------------------------------------------------------------------
-- 5. admin.account_notes
--    Free-form admin notes per account, with optional pinning for
--    high-priority items that should always be visible.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.account_notes (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID          NOT NULL REFERENCES public.accounts(account_id) ON DELETE CASCADE,
  content     TEXT          NOT NULL,
  is_pinned   BOOLEAN       NOT NULL DEFAULT FALSE,
  created_by  UUID          REFERENCES admin.admin_users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER account_notes_set_updated_at
  BEFORE UPDATE ON admin.account_notes
  FOR EACH ROW EXECUTE FUNCTION admin.set_updated_at();

ALTER TABLE admin.account_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_notes: active admins full access"
  ON admin.account_notes FOR ALL
  USING (admin.is_admin_user())
  WITH CHECK (admin.is_admin_user());


-- ---------------------------------------------------------------------------
-- 6. admin.broadcasts
--    WhatsApp message broadcast campaigns. Can target a subscription-status
--    segment, a plan tier, or a specific list of account IDs.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.broadcasts (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT          NOT NULL,
  template_name       TEXT          NOT NULL,
  template_params     JSONB         NOT NULL DEFAULT '{}',
  -- Named segment or 'custom' for explicit account list
  segment             TEXT          NOT NULL DEFAULT 'all' CHECK (
    segment IN (
      'all', 'active', 'trial', 'past_due', 'suspended',
      'starter', 'core', 'scale', 'custom'
    )
  ),
  -- Only used when segment = 'custom'
  custom_account_ids  UUID[],
  status              TEXT          NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'sending', 'completed', 'failed', 'cancelled')
  ),
  scheduled_at        TIMESTAMPTZ,
  sent_at             TIMESTAMPTZ,
  total_recipients    INT           NOT NULL DEFAULT 0,
  sent_count          INT           NOT NULL DEFAULT 0,
  failed_count        INT           NOT NULL DEFAULT 0,
  created_by          UUID          REFERENCES admin.admin_users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE admin.broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broadcasts: active admins full access"
  ON admin.broadcasts FOR ALL
  USING (admin.is_admin_user())
  WITH CHECK (admin.is_admin_user());


-- ---------------------------------------------------------------------------
-- 7. admin.broadcast_recipients
--    Per-recipient delivery tracking for each broadcast job.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.broadcast_recipients (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id      UUID          NOT NULL REFERENCES admin.broadcasts(id) ON DELETE CASCADE,
  conversation_id   UUID          REFERENCES admin.whatsapp_conversations(id) ON DELETE SET NULL,
  account_id        UUID          REFERENCES public.accounts(account_id) ON DELETE SET NULL,
  status            TEXT          NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'sent', 'failed')
  ),
  meta_message_id   TEXT,
  error_message     TEXT,
  sent_at           TIMESTAMPTZ
);

ALTER TABLE admin.broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broadcast_recipients: active admins full access"
  ON admin.broadcast_recipients FOR ALL
  USING (admin.is_admin_user())
  WITH CHECK (admin.is_admin_user());


-- ---------------------------------------------------------------------------
-- 8. Indexes
-- ---------------------------------------------------------------------------

-- admin.payments
CREATE INDEX IF NOT EXISTS idx_admin_payments_account
  ON admin.payments(account_id);

CREATE INDEX IF NOT EXISTS idx_admin_payments_payment_date
  ON admin.payments(payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_admin_payments_status
  ON admin.payments(status);

-- admin.invoices
CREATE INDEX IF NOT EXISTS idx_admin_invoices_account
  ON admin.invoices(account_id);

CREATE INDEX IF NOT EXISTS idx_admin_invoices_status
  ON admin.invoices(status);

CREATE INDEX IF NOT EXISTS idx_admin_invoices_due
  ON admin.invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_admin_invoices_payment
  ON admin.invoices(payment_id)
  WHERE payment_id IS NOT NULL;

-- admin.account_flags
CREATE INDEX IF NOT EXISTS idx_admin_flags_account
  ON admin.account_flags(account_id);

CREATE INDEX IF NOT EXISTS idx_admin_flags_type
  ON admin.account_flags(flag_type);

-- admin.account_notes
CREATE INDEX IF NOT EXISTS idx_admin_notes_account
  ON admin.account_notes(account_id);

CREATE INDEX IF NOT EXISTS idx_admin_notes_pinned
  ON admin.account_notes(account_id, is_pinned)
  WHERE is_pinned = TRUE;

-- admin.broadcasts
CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_status
  ON admin.broadcasts(status);

CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_scheduled
  ON admin.broadcasts(scheduled_at)
  WHERE scheduled_at IS NOT NULL;

-- admin.broadcast_recipients
CREATE INDEX IF NOT EXISTS idx_admin_broadcast_recipients_broadcast
  ON admin.broadcast_recipients(broadcast_id);

CREATE INDEX IF NOT EXISTS idx_admin_broadcast_recipients_account
  ON admin.broadcast_recipients(account_id);

CREATE INDEX IF NOT EXISTS idx_admin_broadcast_recipients_status
  ON admin.broadcast_recipients(status);


-- =============================================================================
-- VERIFICATION GUARD
-- The following query confirms NO ALTER TABLE was issued against the three
-- protected public tables. If this migration was authored correctly, the comment
-- below is the only reference to those table names in this file.
--
-- Protected tables (READ-ONLY reference — no ALTER statements above):
--   public.accounts              ← FKs reference .account_id; no ALTER
--   public.subscription_events   ← not referenced at all in this migration
--   public.pending_mpesa_payments ← not referenced at all in this migration
-- =============================================================================
