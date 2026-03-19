-- Migration 011: Update Production Status CHECK Constraint
-- Purpose: Add support for steaming_dry_cows and open_culling_dry_cows production statuses
-- This migration updates the CHECK constraint from migration 010 to include additional valid statuses

-- ============================================
-- 1. DROP OLD CHECK CONSTRAINT
-- ============================================
ALTER TABLE public.animal_categories
DROP CONSTRAINT IF EXISTS check_production_status_values;

-- ============================================
-- 2. ADD NEW CHECK CONSTRAINT WITH ADDITIONAL STATUSES
-- ============================================
-- Now includes: calf, heifer, served, lactating, steaming_dry_cows, open_culling_dry_cows, bull
ALTER TABLE public.animal_categories
ADD CONSTRAINT check_production_status_values 
  CHECK (production_status IN ('calf', 'heifer', 'served', 'lactating', 'steaming_dry_cows', 'open_culling_dry_cows', 'bull'));

-- ============================================
-- 3. ADD COMMENT DOCUMENTING THE VALID VALUES
-- ============================================
COMMENT ON CONSTRAINT check_production_status_values ON public.animal_categories IS 
'Valid production statuses: calf, heifer, served, lactating, steaming_dry_cows, open_culling_dry_cows, bull';

COMMENT ON COLUMN public.animal_categories.production_status IS 
'Production status: calf, heifer, served, lactating, steaming_dry_cows, open_culling_dry_cows, bull';
