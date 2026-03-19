-- Add support for multiple production statuses in animal_categories table
-- Migration: 014_add_production_statuses_support.sql

-- Add new column to store multiple production statuses
ALTER TABLE public.animal_categories
ADD COLUMN production_statuses character varying(50)[] NULL;

-- Create index on production_statuses for query performance
CREATE INDEX IF NOT EXISTS idx_animal_categories_production_statuses_gin 
ON public.animal_categories USING GIN (production_statuses) 
TABLESPACE pg_default;

-- Update the CHECK constraint on production_status to allow NULL (backward compatibility)
-- This allows either production_status (single) or production_statuses (multiple) to be used

-- Add a function to validate production_statuses array values
CREATE OR REPLACE FUNCTION validate_production_statuses()
RETURNS TRIGGER AS $$
DECLARE
  valid_statuses TEXT[] := ARRAY['calf', 'heifer', 'served', 'lactating', 'steaming_dry_cows', 'open_culling_dry_cows', 'bull'];
  status TEXT;
BEGIN
  -- If production_statuses is provided, validate each status
  IF NEW.production_statuses IS NOT NULL AND array_length(NEW.production_statuses, 1) > 0 THEN
    FOREACH status IN ARRAY NEW.production_statuses LOOP
      IF NOT (status = ANY(valid_statuses)) THEN
        RAISE EXCEPTION 'Invalid production status: %', status;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate production_statuses on insert/update
CREATE TRIGGER trg_validate_production_statuses_insert
BEFORE INSERT ON public.animal_categories
FOR EACH ROW
EXECUTE FUNCTION validate_production_statuses();

CREATE TRIGGER trg_validate_production_statuses_update
BEFORE UPDATE ON public.animal_categories
FOR EACH ROW
EXECUTE FUNCTION validate_production_statuses();

-- Add comment to document the new column
COMMENT ON COLUMN public.animal_categories.production_statuses IS 'Array of production statuses for this category. Allows multiple statuses per category for flexible grouping.';
