-- Migration 010: Enhanced Animal Categories with Dynamic Characteristics
-- Purpose:
--   1. Add new columns: gender, production_status, min_age_days, max_age_days, characteristics
--   2. Rename category_name to name for consistency
--   3. Add updated_at timestamp column
--   4. Create indexes for common queries
--   5. Update constraints to support new schema

-- ============================================
-- 1. ADD NEW COLUMNS TO animal_categories
-- ============================================

-- Add gender column (any, male, female)
ALTER TABLE public.animal_categories
ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'any';

-- Add production_status column
ALTER TABLE public.animal_categories
ADD COLUMN IF NOT EXISTS production_status VARCHAR(50);

-- Add age range columns
ALTER TABLE public.animal_categories
ADD COLUMN IF NOT EXISTS min_age_days INTEGER,
ADD COLUMN IF NOT EXISTS max_age_days INTEGER;

-- Add characteristics JSONB column (stores ranges, checkboxes, milking schedules)
ALTER TABLE public.animal_categories
ADD COLUMN IF NOT EXISTS characteristics JSONB DEFAULT '{}'::jsonb;

-- Add updated_at timestamp for tracking modifications
ALTER TABLE public.animal_categories
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- ============================================
-- 2. RENAME category_name to name (for API consistency)
-- ============================================
-- Check if column exists before renaming
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'animal_categories' AND column_name = 'category_name') THEN
    ALTER TABLE public.animal_categories
    RENAME COLUMN category_name TO name;
  END IF;
END
$$;

-- ============================================
-- 3. UPDATE UNIQUE CONSTRAINT
-- ============================================
-- Drop old constraint if it exists
ALTER TABLE public.animal_categories
DROP CONSTRAINT IF EXISTS animal_categories_farm_id_category_name_key;

-- Add new constraint with 'name' column
ALTER TABLE public.animal_categories
ADD CONSTRAINT animal_categories_farm_id_name_key 
  UNIQUE (farm_id, name);

-- ============================================
-- 4. CREATE/UPDATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for farm filtering (primary access pattern)
CREATE INDEX IF NOT EXISTS idx_animal_categories_farm_id 
  ON public.animal_categories USING btree (farm_id);

-- Index for default category lookup
CREATE INDEX IF NOT EXISTS idx_animal_categories_farm_default 
  ON public.animal_categories USING btree (farm_id, is_default);

-- Index for active category filtering
CREATE INDEX IF NOT EXISTS idx_animal_categories_farm_active 
  ON public.animal_categories USING btree (farm_id, is_active);

-- Index for production status filtering (used in characteristics selection)
CREATE INDEX IF NOT EXISTS idx_animal_categories_production_status 
  ON public.animal_categories USING btree (farm_id, production_status);

-- Index for gender filtering
CREATE INDEX IF NOT EXISTS idx_animal_categories_gender 
  ON public.animal_categories USING btree (farm_id, gender);

-- GIN index for JSONB characteristics (efficient for complex searches)
CREATE INDEX IF NOT EXISTS idx_animal_categories_characteristics_gin 
  ON public.animal_categories USING gin (characteristics);

-- ============================================
-- 5. ADD DATA VALIDATION CONSTRAINTS
-- ============================================

-- Add CHECK constraint for valid gender values
ALTER TABLE public.animal_categories
ADD CONSTRAINT check_gender_values 
  CHECK (gender IN ('any', 'male', 'female'));

-- Add CHECK constraint for valid production statuses
ALTER TABLE public.animal_categories
ADD CONSTRAINT check_production_status_values 
  CHECK (production_status IN ('calf', 'heifer', 'served', 'lactating', 'steaming_dry_cows', 'open_culling_dry_cows', 'bull'));

-- Add CHECK constraint for age ranges (min <= max if both provided)
ALTER TABLE public.animal_categories
ADD CONSTRAINT check_age_range 
  CHECK (
    (min_age_days IS NULL AND max_age_days IS NULL) OR
    (min_age_days IS NULL AND max_age_days IS NOT NULL) OR
    (min_age_days IS NOT NULL AND max_age_days IS NULL) OR
    (min_age_days <= max_age_days)
  );

-- Add CHECK constraint for valid age values (>= 0)
ALTER TABLE public.animal_categories
ADD CONSTRAINT check_age_non_negative 
  CHECK (
    (min_age_days IS NULL OR min_age_days >= 0) AND
    (max_age_days IS NULL OR max_age_days >= 0)
  );

-- ============================================
-- 6. UPDATE TRIGGER FOR updated_at TIMESTAMP
-- ============================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_animal_categories_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trg_animal_categories_update_timestamp ON public.animal_categories;

-- Create trigger
CREATE TRIGGER trg_animal_categories_update_timestamp
BEFORE UPDATE ON public.animal_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_animal_categories_timestamp();

-- ============================================
-- 7. GRANT PERMISSIONS (RLS compatible)
-- ============================================
-- Ensure appropriate permissions for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.animal_categories TO authenticated;

COMMENT ON TABLE public.animal_categories IS 'Animal category definitions for filtering and grouping animals with dynamic characteristics and milking schedules';
COMMENT ON COLUMN public.animal_categories.characteristics IS 'JSONB object containing ranges (min/max metrics), checkboxes (health/feeding), and milking schedules with times';
COMMENT ON COLUMN public.animal_categories.gender IS 'Gender filter: any, male, female';
COMMENT ON COLUMN public.animal_categories.production_status IS 'Production status: calf, heifer, served, lactating, steaming_dry_cows, open_culling_dry_cows, bull';
COMMENT ON COLUMN public.animal_categories.min_age_days IS 'Minimum age in days for animals in this category';
COMMENT ON COLUMN public.animal_categories.max_age_days IS 'Maximum age in days for animals in this category';
