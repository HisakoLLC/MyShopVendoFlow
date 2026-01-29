-- Add currency and tax_inclusive to business_settings
-- Run in Supabase SQL Editor.

ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KES',
ADD COLUMN IF NOT EXISTS tax_inclusive boolean DEFAULT false;

COMMENT ON COLUMN public.business_settings.currency IS 'Currency code for display (e.g. KES, USD)';
COMMENT ON COLUMN public.business_settings.tax_inclusive IS 'If true, prices include tax; if false, tax is added on top';
