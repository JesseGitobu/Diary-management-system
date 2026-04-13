-- Migration: Add created_by and updated_by audit columns to feed_types table
-- Date: 2026-04-11

-- Add created_by column (references auth.users)
ALTER TABLE public.feed_types
ADD COLUMN created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add updated_by column (references auth.users)
ALTER TABLE public.feed_types
ADD COLUMN updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.feed_types.created_by IS 'User who created this feed type';
COMMENT ON COLUMN public.feed_types.updated_by IS 'User who last updated this feed type';
