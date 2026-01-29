-- Remove demo data feature from the database.
-- Run this in Supabase SQL Editor if you want to drop the has_demo_data column from accounts.
-- The app no longer uses Load demo data / Delete demo data; this script cleans the optional column.

ALTER TABLE public.accounts DROP COLUMN IF EXISTS has_demo_data;
