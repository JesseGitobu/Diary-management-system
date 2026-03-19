-- Migration: Make semen_code optional for AI services and calving_date nullable
-- Date: 2026-03-14
-- Purpose: 
--   1. Remove requirement for semen_code on artificial insemination services
--      (semen code may be unknown during import)
--   2. Make calving_date nullable in calving_records
--      (pregnancy success ≠ calving occurred; calving may happen later or not occur)

-- Drop the constraint that requires semen_code for AI services
ALTER TABLE public.service_records
DROP CONSTRAINT IF EXISTS service_records_ai_requires_semen_code;

-- Make calving_date nullable (pregnancy success doesn't mean animal has calved yet)
ALTER TABLE public.calving_records
ALTER COLUMN calving_date DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN public.service_records.bull_tag_or_semen_code IS 
'Semen code or bull tag - optional. May be unknown during import of historical records.';

COMMENT ON COLUMN public.calving_records.calving_date IS 
'Date of calving - optional. Null when pregnancy is confirmed but animal has not yet calved. Will be populated when calving event occurs.';
