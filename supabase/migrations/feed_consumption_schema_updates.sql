-- Migration: Add feed_mix_recipe_id and update feed_consumption schema
-- Purpose: Support feed-mix-recipe mode data storage
-- Date: 2026-02-15

-- 1. Add feed_mix_recipe_id column to feed_consumption
ALTER TABLE public.feed_consumption 
ADD COLUMN IF NOT EXISTS feed_mix_recipe_id uuid NULL;

-- 2. Add foreign key constraint for feed_mix_recipe_id
ALTER TABLE public.feed_consumption
ADD CONSTRAINT feed_consumption_feed_mix_recipe_id_fkey 
FOREIGN KEY (feed_mix_recipe_id) REFERENCES feed_mix_recipes (id) ON DELETE SET NULL;

-- 3. Add index for feed_mix_recipe_id for better query performance
CREATE INDEX IF NOT EXISTS idx_feed_consumption_feed_mix_recipe_id 
ON public.feed_consumption USING btree (feed_mix_recipe_id) TABLESPACE pg_default;

-- 4. Update CHECK constraint for feeding_mode to include 'feed-mix-recipe'
-- First drop the old constraint
ALTER TABLE public.feed_consumption
DROP CONSTRAINT IF EXISTS feed_consumption_feeding_mode_check;

-- Then add the new constraint using simpler IN syntax
ALTER TABLE public.feed_consumption
ADD CONSTRAINT feed_consumption_feeding_mode_check 
CHECK (feeding_mode IN ('individual', 'batch', 'feed-mix-recipe'));

-- 5. Ensure entries and observations columns are properly defined for JSONB storage
-- (Already exist in schema, just documented here for reference)
-- entries: Stores detailed feed entries with ingredient breakdown
-- observations: Stores animal-specific observations and calculated data

