-- Migration: Add Days in Milk column to lactation_cycle_records
-- Purpose: Track the number of days in current lactation cycle
-- Automatically calculated and updated via trigger
-- Updated daily while active, frozen once cycle ends

-- Add the days_in_milk column
ALTER TABLE public.lactation_cycle_records
ADD COLUMN IF NOT EXISTS days_in_milk smallint NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.lactation_cycle_records.days_in_milk 
IS 'Number of days elapsed in the lactation cycle. 
    While active: CURRENT_DATE - start_date
    After completed: actual_end_date - start_date
    Updated automatically via trigger.';

-- Create index for fast filtering by days in milk
CREATE INDEX IF NOT EXISTS idx_lactation_cycle_records_days_in_milk 
ON public.lactation_cycle_records(days_in_milk);

-- Create composite index for queries filtering by status and DIM
CREATE INDEX IF NOT EXISTS idx_lactation_cycle_records_status_dim
ON public.lactation_cycle_records(status, days_in_milk);

-- Create composite index for animal and DIM queries
CREATE INDEX IF NOT EXISTS idx_lactation_cycle_records_animal_dim
ON public.lactation_cycle_records(animal_id, days_in_milk DESC);

-- Create trigger function to calculate and update days_in_milk
CREATE OR REPLACE FUNCTION public.calculate_days_in_milk()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate days_in_milk based on status
  IF NEW.status = 'active' THEN
    -- For active cycles: current date minus start date
    NEW.days_in_milk := CAST((CURRENT_DATE - NEW.start_date) AS smallint);
  ELSE
    -- For inactive cycles: actual_end_date minus start_date
    IF NEW.actual_end_date IS NOT NULL THEN
      NEW.days_in_milk := CAST((NEW.actual_end_date - NEW.start_date) AS smallint);
    ELSE
      -- Fallback: use current date if actual_end_date not set
      NEW.days_in_milk := CAST((CURRENT_DATE - NEW.start_date) AS smallint);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate days_in_milk on insert
DROP TRIGGER IF EXISTS trigger_lactation_calculate_dim_insert 
ON public.lactation_cycle_records;

CREATE TRIGGER trigger_lactation_calculate_dim_insert
BEFORE INSERT ON public.lactation_cycle_records
FOR EACH ROW
EXECUTE FUNCTION public.calculate_days_in_milk();

-- Create trigger to automatically calculate days_in_milk on update
DROP TRIGGER IF EXISTS trigger_lactation_calculate_dim_update 
ON public.lactation_cycle_records;

CREATE TRIGGER trigger_lactation_calculate_dim_update
BEFORE UPDATE ON public.lactation_cycle_records
FOR EACH ROW
WHEN (
  OLD.status IS DISTINCT FROM NEW.status 
  OR OLD.start_date IS DISTINCT FROM NEW.start_date
  OR OLD.actual_end_date IS DISTINCT FROM NEW.actual_end_date
)
EXECUTE FUNCTION public.calculate_days_in_milk();

-- Create stored procedure to update days_in_milk for all active cycles
-- This should be called daily via a scheduled job (pg_cron recommended)
CREATE OR REPLACE FUNCTION public.update_active_lactation_days_in_milk()
RETURNS TABLE (updated_count integer) AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- Update all active lactation cycles
  UPDATE public.lactation_cycle_records
  SET 
    days_in_milk = CAST((CURRENT_DATE - start_date) AS smallint),
    updated_at = CURRENT_TIMESTAMP
  WHERE status = 'active';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to ensure days_in_milk is non-negative
ALTER TABLE public.lactation_cycle_records
ADD CONSTRAINT lactation_cycle_records_dim_non_negative 
CHECK (days_in_milk IS NULL OR days_in_milk >= 0);

-- Populate existing records with calculated days_in_milk
UPDATE public.lactation_cycle_records
SET days_in_milk = CAST((
  CASE 
    WHEN status = 'active' THEN CURRENT_DATE - start_date
    ELSE COALESCE(actual_end_date, CURRENT_DATE) - start_date
  END
) AS smallint)
WHERE days_in_milk IS NULL;

COMMENT ON FUNCTION public.calculate_days_in_milk() 
IS 'Trigger function to calculate days_in_milk when lactation records are inserted or updated.';

COMMENT ON FUNCTION public.update_active_lactation_days_in_milk() 
IS 'Stored procedure to refresh days_in_milk for all active lactation cycles. 
    Should be called daily via pg_cron or similar scheduler:
    SELECT cron.schedule(''update-lactation-dim'', ''0 0 * * *'', 
      ''SELECT public.update_active_lactation_days_in_milk()'');';
