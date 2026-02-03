-- Add style-level discount (applies to all variants of that style).
-- Run in Supabase SQL Editor.

ALTER TABLE public.product_styles
ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) NOT NULL DEFAULT 0;

ALTER TABLE public.product_styles
ADD COLUMN IF NOT EXISTS discount_ends_at timestamptz NULL;

COMMENT ON COLUMN public.product_styles.discount_percent IS 'Discount percentage (0-100) applied to all variants of this style at POS and in listings.';
COMMENT ON COLUMN public.product_styles.discount_ends_at IS 'When the discount stops being applied (UTC). NULL = no end date.';

-- Optional: constrain 0-100 (uncomment if desired)
-- ALTER TABLE public.product_styles
-- ADD CONSTRAINT product_styles_discount_percent_check
-- CHECK (discount_percent >= 0 AND discount_percent <= 100);
