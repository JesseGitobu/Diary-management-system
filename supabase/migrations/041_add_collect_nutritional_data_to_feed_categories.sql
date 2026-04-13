-- Migration: Add collect_nutritional_data column to feed_type_categories table
-- Date: 2026-04-10

ALTER TABLE public.feed_type_categories
ADD COLUMN collect_nutritional_data boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.feed_type_categories.collect_nutritional_data IS 'Whether to collect nutritional data for feed types in this category';