-- Quick fix: Remove the overly strict steaming_date constraint
-- Run this in Supabase SQL Editor if the migration 006 was already executed

ALTER TABLE public.pregnancy_records
DROP CONSTRAINT IF EXISTS pregnancy_records_steaming_date_valid;

-- Verify the constraint was removed
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'pregnancy_records'
  AND constraint_name LIKE '%steaming%';

-- Expected result: 0 rows (constraint removed)
