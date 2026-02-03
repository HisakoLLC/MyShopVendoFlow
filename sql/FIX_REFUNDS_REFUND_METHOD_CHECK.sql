-- Fix refunds_refund_method_check so refund_method accepts values our app sends: 'cash', 'mpesa', 'card'.
-- Run in Supabase SQL Editor.

ALTER TABLE public.refunds
  DROP CONSTRAINT IF EXISTS refunds_refund_method_check;

ALTER TABLE public.refunds
  ADD CONSTRAINT refunds_refund_method_check
  CHECK (refund_method IS NULL OR refund_method IN ('cash', 'mpesa', 'card'));
