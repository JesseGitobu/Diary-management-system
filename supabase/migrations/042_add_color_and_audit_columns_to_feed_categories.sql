-- Migration: Add color, updated_at, created_by, and updated_by columns to feed_type_categories table
-- Date: 2026-04-10

-- Add color column
ALTER TABLE public.feed_type_categories
ADD COLUMN color character varying(7) NULL;

-- Add updated_at column
ALTER TABLE public.feed_type_categories
ADD COLUMN updated_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP;

-- Add created_by column (references auth.users)
ALTER TABLE public.feed_type_categories
ADD COLUMN created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add updated_by column (references auth.users)
ALTER TABLE public.feed_type_categories
ADD COLUMN updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.feed_type_categories.color IS 'Hex color code for the category display';
COMMENT ON COLUMN public.feed_type_categories.updated_at IS 'Timestamp of last update';
COMMENT ON COLUMN public.feed_type_categories.created_by IS 'User who created this category';
COMMENT ON COLUMN public.feed_type_categories.updated_by IS 'User who last updated this category';

-- Create index for updated_at for potential query optimization
CREATE INDEX IF NOT EXISTS idx_feed_type_categories_updated_at ON public.feed_type_categories USING btree (updated_at) TABLESPACE pg_default;