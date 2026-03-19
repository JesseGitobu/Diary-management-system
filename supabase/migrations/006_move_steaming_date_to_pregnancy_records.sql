-- Migration: Move steaming_date from calving_records to pregnancy_records
-- Purpose: Refactor schema so steaming_date (pregnancy metadata) lives on pregnancy_records
--          and ensure calving_records are only created when actual_calving_date exists
-- Date: 2026-03-16

-- ============================================================================
-- STEP 1: Add steaming_date column to pregnancy_records
-- ============================================================================
ALTER TABLE public.pregnancy_records
ADD COLUMN steaming_date date null;

COMMENT ON COLUMN public.pregnancy_records.steaming_date IS 
  'Date when the cow is dried off to begin the steaming period before calving';

-- ============================================================================
-- STEP 2: Migrate steaming_date data from calving_records to pregnancy_records
-- ============================================================================
-- Copy steaming_date values from calving_records to their related pregnancy_records
UPDATE public.pregnancy_records pr
SET steaming_date = cr.steaming_date
FROM public.calving_records cr
WHERE pr.id = cr.pregnancy_record_id
  AND cr.steaming_date IS NOT NULL;

-- Log migration result
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM public.pregnancy_records
  WHERE steaming_date IS NOT NULL;
  
  RAISE NOTICE 'Migrated steaming_date to % pregnancy records', migrated_count;
END $$;

-- ============================================================================
-- STEP 3: Delete orphaned calving_records (those without actual_calving_date)
-- ============================================================================
-- These records are no longer valid per the new business logic
-- A calving_record should only exist if an actual_calving_date was recorded
DELETE FROM public.calving_records
WHERE calving_date IS NULL;

-- Log deletion result
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % orphaned calving records (calving_date IS NULL)', deleted_count;
END $$;

-- ============================================================================
-- STEP 4: Remove steaming_date from calving_records
-- ============================================================================
-- Drop indexes that reference steaming_date before dropping the column
DROP INDEX IF EXISTS public.idx_calving_records_steaming_date;
DROP INDEX IF EXISTS public.idx_calving_records_steaming_calving_dates;
DROP INDEX IF EXISTS public.idx_calving_records_steaming_effectiveness;

-- Remove the constraint that validates steaming_date <= calving_date
ALTER TABLE public.calving_records
DROP CONSTRAINT IF EXISTS calving_records_steaming_before_calving_check;

-- Drop the steaming_date column
ALTER TABLE public.calving_records
DROP COLUMN steaming_date;

-- ============================================================================
-- STEP 5: No validation constraint needed on pregnancy_records
-- ============================================================================
-- steaming_date can be null and doesn't need validation against confirmed_date
-- because the original calving_records only validated steaming_date <= calving_date
-- and we don't have access to calving_date in pregnancy_records

-- ============================================================================
-- STEP 6: Create index on pregnancy_records.steaming_date for query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_pregnancy_records_steaming_date 
  ON public.pregnancy_records (steaming_date DESC) 
  TABLESPACE pg_default;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- ✅ steaming_date added to pregnancy_records
-- ✅ steaming_date data migrated from calving_records to pregnancy_records
-- ✅ Orphaned calving_records (without calving_date) deleted
-- ✅ steaming_date removed from calving_records
-- ✅ Related indexes updated/created
-- ✅ Constraints updated to match new schema (removed restrictive check)

-- VERIFICATION QUERIES
-- Find any remaining steaming_date references in calving_records (should be empty):
-- SELECT COUNT(*) FROM information_schema.columns 
-- WHERE table_name = 'calving_records' AND column_name = 'steaming_date';

-- View steaming dates that were migrated (should match earlier count):
-- SELECT COUNT(*) FROM pregnancy_records WHERE steaming_date IS NOT NULL;

-- Verify calving_records now always have calving_date:
-- SELECT COUNT(*) FROM calving_records WHERE calving_date IS NULL;
-- (This should return 0)

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================
-- To rollback this migration, execute:
/*
-- 1. Restore steaming_date column to calving_records
ALTER TABLE public.calving_records
ADD COLUMN steaming_date date null;

-- 2. Copy data back from pregnancy_records to calving_records
UPDATE public.calving_records cr
SET steaming_date = pr.steaming_date
FROM public.pregnancy_records pr
WHERE pr.id = cr.pregnancy_record_id
  AND pr.steaming_date IS NOT NULL;

-- 3. Restore the original constraint on calving_records
ALTER TABLE public.calving_records
ADD CONSTRAINT calving_records_steaming_before_calving_check CHECK (
  (steaming_date is null) or (calving_date is null) or (steaming_date <= calving_date)
);

-- 4. Recreate the indexes on calving_records
CREATE INDEX IF NOT EXISTS idx_calving_records_steaming_date 
  ON public.calving_records (steaming_date DESC) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_calving_records_steaming_calving_dates 
  ON public.calving_records (steaming_date, calving_date DESC) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_calving_records_steaming_effectiveness 
  ON public.calving_records (steaming_date, colostrum_produced DESC) TABLESPACE pg_default;

-- 5. Drop the new index from pregnancy_records
DROP INDEX IF EXISTS public.idx_pregnancy_records_steaming_date;

-- 6. Remove steaming_date from pregnancy_records
ALTER TABLE public.pregnancy_records
DROP COLUMN steaming_date;
*/
